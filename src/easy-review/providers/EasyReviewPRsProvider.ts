import * as vscode from 'vscode';
import {
  DirectoryNode,
  EasyReviewTreeNode,
  ErrorNode,
  LoadingNode,
} from './EasyReviewTreeNodes';
import { PRTreeItem } from './PRTreeItem';
import { AuthProvider } from '../../common/authentication';
import { CredentialStore } from '../../github/credentials';
import { fetchPRFiles } from '../github/PRFileFetcher';
import type { StoredPR } from '../storage/types';
import { buildDirectoryTree } from '../utils/directoryTree';

/**
 * 3-level TreeDataProvider for Easy Review's PR list (NAV-01).
 * Level 1: PRTreeItem (one per PR)
 * Level 2: DirectoryNode (directory segments from file paths)
 * Level 3: FileNode (individual changed files)
 *
 * Registered alongside (not replacing) the upstream PullRequestsTreeDataProvider.
 * View ID: 'easy-review.prList'
 */
export class EasyReviewPRsProvider implements vscode.TreeDataProvider<EasyReviewTreeNode> {
  private _onDidChangeTreeData =
    new vscode.EventEmitter<EasyReviewTreeNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private prs: PRTreeItem[] = [];
  private credentialStore: CredentialStore | undefined;

  constructor(credentialStore?: CredentialStore) {
    this.credentialStore = credentialStore;
  }

  /**
   * Inject (or update) the credential store after construction.
   * Called from activation.ts after the provider is registered.
   */
  setCredentialStore(cs: CredentialStore): void {
    this.credentialStore = cs;
  }

  getTreeItem(element: EasyReviewTreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EasyReviewTreeNode): vscode.ProviderResult<EasyReviewTreeNode[]> {
    if (!element) {
      return this.prs;
    }

    if (element instanceof PRTreeItem) {
      if (element.children === undefined) {
        element.children = 'loading';
        void this.loadFilesForPR(element);
        return [new LoadingNode()];
      }
      if (element.children === 'loading') {
        return [new LoadingNode()];
      }
      if (element.children === 'error') {
        return [new ErrorNode(element.pr)];
      }
      return element.children;
    }

    if (element instanceof DirectoryNode) {
      return element.children;
    }

    // FileNode, LoadingNode, ErrorNode — no children
    return [];
  }

  /**
   * Asynchronously load files for the given PRTreeItem.
   * On success: sets item.children to the built directory tree and fires refresh for that item.
   * On failure: sets item.children to 'error', shows error message, fires refresh for that item.
   *
   * Per Pitfall 2: fires onDidChangeTreeData(item) — NOT undefined — to avoid full tree refresh.
   */
  private async loadFilesForPR(item: PRTreeItem): Promise<void> {
    // Yield to the microtask queue before modifying state so that getChildren's
    // return value ([LoadingNode]) reaches the caller before children changes.
    await Promise.resolve();

    const octokit = this.credentialStore?.getHub(AuthProvider.github)?.octokit?.api;
    if (!octokit) {
      item.children = 'error';
      this._onDidChangeTreeData.fire(item);
      vscode.window.showErrorMessage(
        `Easy Review: Failed to load files for PR #${item.pr.prNumber}. Not signed in to GitHub.`
      );
      return;
    }

    const [owner, repo] = item.pr.repoId.split('/');
    try {
      const files = await fetchPRFiles(octokit, owner, repo, item.pr.prNumber);
      item.children = buildDirectoryTree(files, item.pr);
      this._onDidChangeTreeData.fire(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      item.children = 'error';
      this._onDidChangeTreeData.fire(item);
      vscode.window.showErrorMessage(
        `Easy Review: Failed to load files for PR #${item.pr.prNumber}. ${msg}`
      );
    }
  }

  /**
   * Reset a PR's file tree state and trigger a re-load on next expand.
   * Used by easy-review.retryLoadFiles command (D-08).
   */
  retryLoadFiles(pr: StoredPR): void {
    const item = this.prs.find(
      p => p.pr.repoId === pr.repoId && p.pr.prNumber === pr.prNumber
    );
    if (!item) { return; }
    item.children = undefined;
    this._onDidChangeTreeData.fire(item);
  }

  /**
   * Replace the current list with new StoredPRs and fire a tree refresh.
   * New PRTreeItem instances start with children === undefined (fresh state).
   */
  refresh(prs: StoredPR[]): void {
    this.prs = prs.map(pr => new PRTreeItem(pr));
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Add a single PR to the list without replacing everything.
   */
  addPR(pr: StoredPR): void {
    // Avoid duplicates
    const exists = this.prs.some(
      item => item.pr.repoId === pr.repoId && item.pr.prNumber === pr.prNumber
    );
    if (!exists) {
      this.prs.unshift(new PRTreeItem(pr));
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  /**
   * Remove a PR from the list by repoId + prNumber (D-07: removal).
   */
  removePR(repoId: string, prNumber: number): void {
    this.prs = this.prs.filter(
      item => !(item.pr.repoId === repoId && item.pr.prNumber === prNumber)
    );
    this._onDidChangeTreeData.fire(undefined);
  }
}
