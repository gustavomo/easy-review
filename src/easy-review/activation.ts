import * as vscode from 'vscode';
import { EasyReviewPRsProvider } from './providers/EasyReviewPRsProvider';
import { SQLiteStore } from './storage/SQLiteStore';
import type { StorageAdapter } from './storage/StorageAdapter';
import { parsePRUrl } from './github/PRUrlParser';
import { resolveClaudePath } from './cli/PathResolver';
import { getOutputChannel, disposeOutputChannel } from './cli/OutputChannelReporter';
import { CredentialStore } from '../github/credentials';
import { AuthProvider } from '../common/authentication';
import { PRPersistenceService } from './github/PRPersistenceService';

// Module-level references so other commands can access them
let _provider: EasyReviewPRsProvider | undefined;
let _store: StorageAdapter | undefined;

export function getProvider(): EasyReviewPRsProvider | undefined { return _provider; }
export function getStore(): StorageAdapter | undefined { return _store; }

/**
 * Called from src/extension.ts activate() hook.
 * All Easy Review feature registration happens here.
 * Phase 1: registers tree view, commands, and CLI subprocess infrastructure.
 */
export async function activateEasyReview(
	context: vscode.ExtensionContext,
	credentialStore?: CredentialStore,
): Promise<void> {
	// 1. Initialize SQLite store (DB-01, DB-02)
	const store = new SQLiteStore();
	try {
		store.initialize(context.globalStorageUri.fsPath);
	} catch {
		// showErrorMessage already called inside SQLiteStore.initialize()
		// Continue without storage — provider will show empty list
	}
	_store = store;

	// 2. Create and register the flat PR list tree view (PRW-01)
	const provider = new EasyReviewPRsProvider();
	_provider = provider;

	const treeView = vscode.window.createTreeView('easy-review.prList', {
		treeDataProvider: provider,
		showCollapseAll: false,
	});
	context.subscriptions.push(treeView);

	// 3. Load persisted PRs from SQLite into the tree view (D-06)
	try {
		const persistedPRs = store.getPRs();
		provider.refresh(persistedPRs);
	} catch {
		// Storage may be unavailable — tree starts empty
	}

	// 4. Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('easy-review.refreshPRList', () => {
			// Full refresh from GitHub — implemented in Plan 01-05
			vscode.window.showInformationMessage('Easy Review: Refresh not yet implemented.');
		}),
		vscode.commands.registerCommand('easy-review.openPRDiff', (pr) => {
			// PRW-02 (Phase 1 approximation): open PR on GitHub in browser.
			// Full in-editor diff via PullRequestModel is deferred to a future phase.
			if (!pr?.url) {
				vscode.window.showErrorMessage('Easy Review: PR has no URL. Cannot open diff.');
				return;
			}
			vscode.env.openExternal(vscode.Uri.parse(pr.url));
		}),

		// Add PR by URL (D-05)
		vscode.commands.registerCommand('easy-review.addPRByUrl', async () => {
			const currentStore = getStore();
			const currentProvider = getProvider();
			if (!currentStore || !currentProvider) {
				vscode.window.showErrorMessage('Easy Review: Storage not available.');
				return;
			}

			const input = await vscode.window.showInputBox({
				prompt: 'Paste a GitHub Pull Request URL',
				placeHolder: 'https://github.com/owner/repo/pull/123',
				validateInput: (value: string) => {
					if (!value || !value.trim()) { return 'URL cannot be empty'; }
					const parsed = parsePRUrl(value);
					return parsed ? null : 'Not a valid GitHub PR URL (expected: https://github.com/{owner}/{repo}/pull/{number})';
				},
			});

			if (!input) { return; } // user cancelled

			const parsed = parsePRUrl(input);
			if (!parsed) { return; } // validated above, but defensive

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Easy Review: Fetching PR #${parsed.prNumber}...`,
					cancellable: false,
				},
				async () => {
					try {
						const hub = credentialStore?.getHub(AuthProvider.github);
						if (!hub) {
							throw new Error(
								'Not signed in to GitHub. Use "GitHub Pull Requests: Sign In" from the Command Palette first.'
							);
						}
						const octokit = hub.octokit.api;
						const service = new PRPersistenceService(currentStore, currentProvider);
						await service.fetchAndPersistPR(octokit, parsed.owner, parsed.repo, parsed.prNumber);
						vscode.window.showInformationMessage(
							`Easy Review: PR #${parsed.prNumber} added successfully.`
						);
					} catch (err: unknown) {
						const msg = err instanceof Error ? err.message : String(err);
						vscode.window.showErrorMessage(`Easy Review: Failed to fetch PR. ${msg}`);
					}
				}
			);
		}),

		// Remove PR and all its data (D-07)
		vscode.commands.registerCommand('easy-review.removePR', async (item) => {
			if (!item?.pr) { return; }
			const confirmed = await vscode.window.showWarningMessage(
				`Remove PR #${item.pr.prNumber} and all its data permanently?`,
				{ modal: true },
				'Remove'
			);
			if (confirmed !== 'Remove') { return; }

			const currentStore = getStore();
			const currentProvider = getProvider();
			if (currentStore && currentProvider) {
				currentStore.deletePR(item.pr.repoId, item.pr.prNumber);
				currentProvider.removePR(item.pr.repoId, item.pr.prNumber);
			}
		}),

		// Test CLI integration — proves the full subprocess streaming chain works (Phase 1 validation)
		vscode.commands.registerCommand('easy-review.testCLI', async () => {
			const path = resolveClaudePath() ??
				context.globalState.get<string>('easyReview.claudePath.resolved');

			if (!path) {
				vscode.window.showErrorMessage(
					'Easy Review: claude CLI not found. Configure easyReview.claudePath in settings.'
				);
				return;
			}

			const outputChannel = getOutputChannel();
			outputChannel.show();

			const { runClaudeStreaming } = await import('./cli/SubprocessRunner');
			const tokenSource = new vscode.CancellationTokenSource();

			try {
				await runClaudeStreaming(path, {
					prompt: 'Say "Easy Review Phase 1 integration test: OK" and nothing else.',
					token: tokenSource.token,
					outputChannel,
				});
				vscode.window.showInformationMessage('Easy Review: CLI test passed. See Output Channel for results.');
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				vscode.window.showErrorMessage(`Easy Review: CLI test failed. ${msg}`);
			} finally {
				tokenSource.dispose();
			}
		}),
	);

	// CFG-01 + CFG-02: Detect claude CLI path; show setup notification on first activation if not found
	const claudePath = resolveClaudePath();
	if (claudePath) {
		// Store the resolved path so it persists across restarts (avoids re-running shell detection every activation)
		await context.globalState.update('easyReview.claudePath.resolved', claudePath);
	} else {
		// Show setup notification — but only once per install to avoid notification fatigue (CFG-02)
		const alreadyShown = context.globalState.get<boolean>('easyReview.claudeNotFoundShown');
		if (!alreadyShown) {
			await context.globalState.update('easyReview.claudeNotFoundShown', true);
			const action = await vscode.window.showWarningMessage(
				'Easy Review: The `claude` CLI was not found in PATH. ' +
				'AI review generation will not work until the path is configured.',
				'Configure Path',
				'Dismiss'
			);
			if (action === 'Configure Path') {
				await vscode.commands.executeCommand(
					'workbench.action.openSettings',
					'easyReview.claudePath'
				);
			}
		}
	}
}

/**
 * Called from src/extension.ts deactivate() hook.
 * Kills all running claude CLI subprocesses registered in context.subscriptions.
 */
export function deactivateEasyReview(): void {
	_store?.close();
	_provider = undefined;
	_store = undefined;
	disposeOutputChannel();
}
