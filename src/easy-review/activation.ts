import * as vscode from 'vscode';
import { EasyReviewPRsProvider } from './providers/EasyReviewPRsProvider';
import { SQLiteStore } from './storage/SQLiteStore';
import type { StorageAdapter } from './storage/StorageAdapter';
import { parsePRUrl } from './github/PRUrlParser';

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
export function activateEasyReview(context: vscode.ExtensionContext): void {
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
			// PRW-02: open diff for selected PR — delegates to upstream diff view
			vscode.window.showInformationMessage(`Opening diff for PR #${pr?.prNumber ?? '?'}`);
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
						// TODO: Get Octokit from the upstream fork's auth layer (Plan 01-06)
						// For now, surface a clear not-implemented message.
						throw new Error('Octokit integration pending — upstream auth wiring is in Plan 01-06');
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
	);
}

/**
 * Called from src/extension.ts deactivate() hook.
 * Kills all running claude CLI subprocesses registered in context.subscriptions.
 */
export function deactivateEasyReview(): void {
	_store?.close();
	_provider = undefined;
	_store = undefined;
}
