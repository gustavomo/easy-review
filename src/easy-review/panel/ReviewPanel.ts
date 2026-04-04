import * as vscode from 'vscode';
import { AuthProvider } from '../../common/authentication';
import type { CredentialStore } from '../../github/credentials';
import type {
  AgentKey,
  ExtensionMessage,
  ParsedReview,
  WebviewMessage,
  WebviewState,
} from '../../shared/types';
import { runAllAgents } from '../agents/AgentOrchestrator';
import { parseReview } from '../cli/ReviewParser';
import { fetchPRCommits, fetchPRDiff, fetchReviewComments } from '../github/DiffFetcher';
import { readModelConfig } from '../settings/modelSettings';
import type { StorageAdapter } from '../storage/StorageAdapter';
import type { StoredPR, StoredReview } from '../storage/types';

/**
 * Singleton VS Code WebviewPanel that orchestrates AI review generation.
 *
 * Lifecycle (D-19, D-20, D-21):
 *   - One instance reused for all PRs (singleton).
 *   - Opens in vscode.ViewColumn.Two.
 *   - Persists across restarts via state-sync handshake on ready message.
 *
 * Integration chain (Phase 6):
 *   right-click → startReview() → DiffFetcher → runAllAgents() (7 concurrent agents)
 *     → onSectionUpdate → postMessage(sectionUpdate) → saveReview → postMessage(reviewComplete)
 */
export class ReviewPanel {
  private static instance: ReviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private currentState: WebviewState = { status: 'idle' };
  private cancellationSource: vscode.CancellationTokenSource | undefined;
  private reviewQueue: Array<() => Promise<void>> = [];
  private isRunning = false;

  // Set on each startReview call so retryReview can re-run same PR
  private lastPR: { pr: StoredPR; credentialStore: CredentialStore } | undefined;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly store: StorageAdapter,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'easyReview.reviewPanel',
      'Easy Review',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: false, // use stateSync handshake instead (Pitfall 3)
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
        ],
      },
    );

    // Load webview HTML
    this.panel.webview.html = this.getWebviewHtml();

    // Message handler
    this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      this.handleWebviewMessage(msg);
    }, undefined, context.subscriptions);

    // Dispose cleanup — prevents stale instance reference (Pitfall 4)
    this.panel.onDidDispose(() => {
      this.cancellationSource?.cancel();
      this.cancellationSource?.dispose();
      ReviewPanel.instance = undefined;
    }, undefined, context.subscriptions);
  }

  static getOrCreate(context: vscode.ExtensionContext, store: StorageAdapter): ReviewPanel {
    if (!ReviewPanel.instance) {
      ReviewPanel.instance = new ReviewPanel(context, store);
    } else {
      // Bring existing panel to front
      ReviewPanel.instance.panel.reveal(vscode.ViewColumn.Two, false);
    }
    return ReviewPanel.instance;
  }

  /** Called from the easyReview.generateReview command (activation.ts). */
  async startReview(pr: StoredPR, credentialStore: CredentialStore): Promise<void> {
    this.lastPR = { pr, credentialStore };

    // Re-generate confirmation (D-03): check for existing reviews
    const existingReviews = this.store.getReviews(pr.repoId, pr.prNumber);
    if (existingReviews.length > 0) {
      const n = existingReviews.length;
      const s = n === 1 ? '' : 's';
      const confirmed = await vscode.window.showWarningMessage(
        `This PR already has ${n} review${s}. Generate a new one? Both versions will be saved.`,
        { modal: true },
        'Generate New Review',
      );
      if (confirmed !== 'Generate New Review') { return; }
    }

    const task = () => this.executeReview(pr, credentialStore);

    if (this.isRunning) {
      // Queue the task — run after current finishes (D-02)
      this.reviewQueue.push(task);
      vscode.window.showInformationMessage(
        'Easy Review: Review queued — will start after current review finishes.',
      );
    } else {
      await this.runTask(task);
    }
  }

  /**
   * UI-01 (D-04): Load an existing stored review into the panel without triggering AI generation.
   * Called by the easy-review.viewReview command in activation.ts.
   * Pitfall 3: reveal() before updateState/postMessage so webview is active when messages arrive.
   */
  loadReview(stored: StoredReview): void {
    this.panel.reveal(vscode.ViewColumn.Two, false);

    const sections = JSON.parse(stored.parsedJson) as import('../../shared/types').ReviewSection[];
    const review: ParsedReview = {
      id: stored.id,
      prNumber: stored.prNumber,
      repoId: stored.repoId,
      model: stored.modelUsed,
      createdAt: stored.createdAt,
      sections,
    };
    this.updateState({ status: 'complete', review });
    this.postMessage({ type: 'loadReviewResult', review });
  }

  private async runTask(task: () => Promise<void>): Promise<void> {
    this.isRunning = true;
    try {
      await task();
    } finally {
      this.isRunning = false;
      // Drain queue
      if (this.reviewQueue.length > 0) {
        const next = this.reviewQueue.shift()!;
        this.runTask(next); // intentional: not awaited (fire-and-forget queue drain)
      }
    }
  }

  private async executeReview(pr: StoredPR, credentialStore: CredentialStore): Promise<void> {
    // Read model config with D-21 migration (defaultSpec wins, activeModel fallback)
    const config = vscode.workspace.getConfiguration('easyReview');
    const modelConfig = readModelConfig(config);
    const { defaultSpec } = modelConfig;
    const claudePath =
      config.get<string>('claudePath') ||
      this.context.globalState.get<string>('easyReview.claudePath.resolved') ||
      'claude';

    // Transition webview to generating state with all 7 slots as pending
    const AGENT_ORDER: AgentKey[] = [
      'prSummarizer',
      'bugRisk',
      'architectureChange',
      'testCoverage',
      'documentation',
      'diagram',
      'businessImpact',
    ];

    const initialAgentSections = Object.fromEntries(
      AGENT_ORDER.map(key => [key, { status: 'pending' as const }]),
    ) as Record<AgentKey, { status: 'pending' }>;

    this.updateState({
      status: 'generating',
      prTitle: pr.title,
      model: defaultSpec,
      elapsedMs: 0,
      agentSections: initialAgentSections,
    });
    this.postMessage({ type: 'startReview', prNumber: pr.prNumber, prTitle: pr.title, model: defaultSpec });

    // Send all 7 slots as pending to webview
    for (const agentKey of AGENT_ORDER) {
      this.postMessage({ type: 'sectionUpdate', agentKey, state: { status: 'pending' } });
    }

    // Cancellation support (D-04)
    this.cancellationSource?.dispose();
    this.cancellationSource = new vscode.CancellationTokenSource();
    const token = this.cancellationSource.token;

    try {
      // 1. Fetch GitHub data (diff, review comments, commit messages)
      const hub = credentialStore.getHub(AuthProvider.github);
      if (!hub) {
        throw new Error(
          'Not signed in to GitHub. Use "GitHub Pull Requests: Sign In" first.',
        );
      }
      const octokit = hub.octokit.api;

      // Parse owner/repo from repoId "{owner}/{repo}"
      const [owner, repo] = pr.repoId.split('/');

      // Fetch all GitHub data in parallel (D-08, D-09)
      const [diff, , ] = await Promise.all([
        fetchPRDiff(octokit, owner, repo, pr.prNumber),
        fetchReviewComments(octokit, owner, repo, pr.prNumber),
        fetchPRCommits(octokit, owner, repo, pr.prNumber),
      ]);

      // 2. Build file list from diff header lines
      const fileList = diff
        .split('\n')
        .filter(l => l.startsWith('+++ b/'))
        .map(l => l.slice(6))
        .join('\n');

      // 3. Get project analysis from store (lazy context loading)
      const storedAnalysis = this.store.getProjectAnalysis?.();
      const projectAnalysis = storedAnalysis?.contextText ?? undefined;

      // 4. Run all 7 agents concurrently via AgentOrchestrator
      const result = await runAllAgents({
        diff,
        fileList,
        modelConfig,
        claudePath,
        codexPath: config.get<string>('codexPath') || 'codex',
        projectAnalysis,
        token,
        onSectionUpdate: (agentKey, state) => {
          this.postMessage({ type: 'sectionUpdate', agentKey, state });
        },
      });

      // 5. Assemble ParsedReview from completed sections
      const sections = AGENT_ORDER
        .filter(key => result.sections[key].status === 'complete')
        .map(key => {
          const state = result.sections[key];
          const parsed = parseReview(state.content ?? '');
          return parsed[0] ?? { title: key, content: state.content ?? '' };
        });

      // 6. Persist review (REV-04)
      const createdAt = Date.now();
      const savedId = this.store.saveReview({
        repoId: pr.repoId,
        prNumber: pr.prNumber,
        modelUsed: defaultSpec,
        createdAt,
        reviewText: sections.map(s => s.content).join('\n'),
        parsedJson: JSON.stringify(sections),
      });

      const parsedReview: ParsedReview = {
        id: savedId,
        prNumber: pr.prNumber,
        repoId: pr.repoId,
        model: defaultSpec,
        createdAt,
        sections,
      };

      this.updateState({ status: 'complete', review: parsedReview });
      this.postMessage({ type: 'reviewComplete', review: parsedReview });
    } catch (err: unknown) {
      if (token.isCancellationRequested) {
        // Cancel: return to idle (D-04, D-18)
        this.updateState({ status: 'idle' });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        this.updateState({ status: 'error', message: msg });
        this.postMessage({ type: 'reviewError', message: msg });
      }
    } finally {
      this.cancellationSource?.dispose();
      this.cancellationSource = undefined;
    }
  }

  private postStateSync(): void {
    const analysis = this.store.getProjectAnalysis();
    this.postMessage({
      type: 'stateSync',
      state: this.currentState,
      hasAnalysis: analysis !== null,
      analysisDate: analysis?.collectedAt,
    });
  }

  private handleWebviewMessage(msg: WebviewMessage): void {
    switch (msg.type) {
      case 'ready':
        // State-sync handshake (RESEARCH.md Pattern 3 + Pitfall 3)
        this.postStateSync();
        break;

      case 'cancelReview':
        this.cancellationSource?.cancel();
        break;

      case 'retryReview':
        if (this.lastPR) {
          this.startReview(this.lastPR.pr, this.lastPR.credentialStore);
        }
        break;

      case 'loadReview': {
        // VIEW-03: load a prior review version from SQLite
        const repoId =
          this.currentState.status === 'complete' ? this.currentState.review.repoId : '';
        const prNumber =
          this.currentState.status === 'complete' ? this.currentState.review.prNumber : 0;
        const reviews = this.store.getReviews(repoId, prNumber);
        const stored = reviews.find(r => r.id === msg.reviewId);
        if (stored) {
          const sections = JSON.parse(stored.parsedJson);
          const review: ParsedReview = {
            id: stored.id,
            prNumber: stored.prNumber,
            repoId: stored.repoId,
            model: stored.modelUsed,
            createdAt: stored.createdAt,
            sections,
          };
          this.updateState({ status: 'complete', review });
          this.postMessage({ type: 'loadReviewResult', review });
        }
        break;
      }

      case 'requestState':
        // Secondary state request (in addition to ready handshake)
        this.postStateSync();
        break;

      case 'analyzeProject':
        vscode.commands.executeCommand('easyReview.analyzeProject');
        break;

      case 'viewAnalysis':
        vscode.commands.executeCommand('easyReview.viewAnalysis');
        break;
    }
  }

  private updateState(state: WebviewState): void {
    this.currentState = state;
    // Panel title update
    if (state.status === 'complete') {
      this.panel.title = `Easy Review — PR #${state.review.prNumber}`;
    } else {
      this.panel.title = 'Easy Review';
    }
  }

  private postMessage(msg: ExtensionMessage): void {
    // Guard against posting to a disposed panel (Pitfall 4)
    try {
      this.panel.webview.postMessage(msg);
    } catch {
      // Panel already disposed — ignore
    }
  }

  private getWebviewHtml(): string {
    const webviewUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.js'),
    );
    const webviewCssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.css'),
    );
    const codiconsUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode',
        'codicons',
        'dist',
        'codicon.css',
      ),
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${this.panel.webview.cspSource} 'unsafe-eval'; style-src 'unsafe-inline' ${this.panel.webview.cspSource}; font-src ${this.panel.webview.cspSource};">
  <link rel="stylesheet" href="${codiconsUri}" />
  <link rel="stylesheet" href="${webviewCssUri}" />
  <title>Easy Review</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${webviewUri}?v=${nonce}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
