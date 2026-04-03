import * as vscode from 'vscode';
import { AuthProvider } from '../../common/authentication';
import type { CredentialStore } from '../../github/credentials';
import { decodeDiffUri } from './diffUri';

/**
 * TextDocumentContentProvider for the easy-review-diff:// URI scheme.
 *
 * Serves file content to VS Code's diff editor by fetching from GitHub REST API.
 * Registered via vscode.workspace.registerTextDocumentContentProvider in activation.
 *
 * URI shape: easy-review-diff://<owner>+<repo>/<filePath>?ref=<sha>&label=<label>
 *
 * Guards:
 * - EMPTY sentinel ref returns '' without any API call (Pitfall 3 — added/deleted files)
 * - encoding:'none' files (>1MB) return a human-readable placeholder instead of crashing
 * - In-memory URI cache prevents double-fetching when VS Code calls twice for diff view
 * - Buffer.from(...replace(/\n/g,''), 'base64') handles GitHub's newline-padded base64
 */
export class EasyReviewDiffProvider implements vscode.TextDocumentContentProvider {
  // In-memory cache keyed by URI string to avoid double-fetching.
  // VS Code may call provideTextDocumentContent twice for the same URI in a diff view.
  private cache = new Map<string, string>();

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly credentialStore: CredentialStore) {}

  async provideTextDocumentContent(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): Promise<string> {
    const key = uri.toString();
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const { owner, repo, ref, path } = decodeDiffUri(uri);

    // EMPTY sentinel — file doesn't exist at this ref (added at head or removed at base)
    if (ref === 'EMPTY') {
      this.cache.set(key, '');
      return '';
    }

    const hub = this.credentialStore.getHub(AuthProvider.github);
    if (!hub) {
      throw new Error('Not signed in to GitHub. Use "GitHub Pull Requests: Sign In" first.');
    }

    const octokit = hub.octokit.api;
    try {
      const response = await (octokit as any).rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      const data = response.data as { content?: string; encoding?: string };

      let content: string;
      if (data.encoding === 'base64' && data.content) {
        // GitHub may include newlines in base64 string — strip them before decode
        content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
      } else if (data.encoding === 'none' || !data.content) {
        // File > 1MB — GitHub returns encoding:'none', no content (anti-pattern guard)
        content = `[File too large to display — view on GitHub: ${owner}/${repo}/blob/${ref}/${path}]`;
      } else {
        content = data.content ?? '';
      }

      this.cache.set(key, content);
      return content;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Easy Review: Failed to fetch file content for ${path}@${ref}. ${msg}`);
    }
  }
}
