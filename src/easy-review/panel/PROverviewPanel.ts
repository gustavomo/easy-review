import * as vscode from 'vscode';
import type { StoredPRData } from '../../webview/PROverviewPanel';
import type { StoredPR } from '../storage/types';

/**
 * VS Code WebviewPanel that shows PR metadata overview.
 *
 * Not a singleton — each call to open() creates a fresh panel (D-14).
 * Opens in ViewColumn.Two alongside the editor.
 *
 * Data flow:
 *   activation.ts → PROverviewPanel.open(context, pr)
 *     → creates webview → sends loadPR message with extracted PR data
 *     → webview renders PROverviewPanel React component
 */
export class PROverviewPanel {
  static open(context: vscode.ExtensionContext, pr: StoredPR): PROverviewPanel {
    return new PROverviewPanel(context, pr);
  }

  private readonly panel: vscode.WebviewPanel;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    pr: StoredPR,
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'easyReview.prOverviewPanel',
      `PR #${pr.prNumber}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
        ],
      },
    );

    // Load webview HTML pointing to prOverview.js
    this.panel.webview.html = this.getWebviewHtml();

    // Handle messages from webview (e.g., openExternal)
    this.panel.webview.onDidReceiveMessage((msg: { type: string; url?: string }) => {
      if (msg.type === 'openExternal' && msg.url) {
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
      }
    }, undefined, context.subscriptions);

    // Dispose cleanup
    this.panel.onDidDispose(() => {
      // Nothing to clean up — not a singleton
    }, undefined, context.subscriptions);

    // Send PR data to webview immediately after creation
    const prData = extractPRData(pr);
    // Small delay ensures the webview is ready before postMessage
    setTimeout(() => {
      this.panel.webview.postMessage({ type: 'loadPR', pr: prData });
    }, 100);
  }

  private getWebviewHtml(): string {
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'prOverview.js'),
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' ${this.panel.webview.cspSource}; font-src ${this.panel.webview.cspSource};">
  <title>PR Overview</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function extractPRData(pr: StoredPR): StoredPRData {
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(pr.raw) as Record<string, unknown>;
  } catch {
    // If JSON.parse fails, raw stays as empty object — all fields fall back to defaults
  }
  return {
    title: pr.title,
    body: (raw.body as string | null | undefined) ?? null,
    author: pr.author,
    state: (raw.merged === true ? 'closed' : pr.state) as 'open' | 'closed',
    merged: raw.merged === true,
    createdAt: (raw.created_at as string | undefined) ?? '',
    mergedAt: (raw.merged_at as string | null | undefined) ?? null,
    changedFiles: (raw.changed_files as number | undefined) ?? 0,
    additions: (raw.additions as number | undefined) ?? 0,
    deletions: (raw.deletions as number | undefined) ?? 0,
    htmlUrl: pr.url,
    prNumber: pr.prNumber,
    repoId: pr.repoId,
  };
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
