import * as vscode from 'vscode';
import { PRTreeItem } from './PRTreeItem';
import { GitChangeType } from '../../common/file';
import { toResourceUri } from '../../common/uri';
import type { StoredPR } from '../storage/types';

/** Represents a single changed file in a PR — mirrors GitHub API file object */
export interface PRFileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  previous_filename?: string;
  sha: string;
}

/** Three-level tree hierarchy node union for Phase 02.1 (NAV-01) */
export type EasyReviewTreeNode = PRTreeItem | DirectoryNode | FileNode | LoadingNode | ErrorNode;

// Icon map for file statuses — matches upstream fileChangeNode icons
const FILE_STATUS_ICON: Record<PRFileChange['status'], string> = {
  added: 'diff-added',
  removed: 'diff-removed',
  renamed: 'diff-renamed',
  modified: 'diff-modified',
  copied: 'diff-modified',
  changed: 'diff-modified',
  unchanged: 'diff-modified',
};

// Map GitHub API status to GitChangeType for resourceUri coloring (git decorations)
const STATUS_TO_GIT_CHANGE_TYPE: Record<PRFileChange['status'], GitChangeType> = {
  added: GitChangeType.ADD,
  removed: GitChangeType.DELETE,
  modified: GitChangeType.MODIFY,
  renamed: GitChangeType.RENAME,
  copied: GitChangeType.COPY,
  changed: GitChangeType.MODIFY,
  unchanged: GitChangeType.MODIFY,
};

/**
 * DirectoryNode — represents a directory segment in the PR file tree (D-01)
 */
export class DirectoryNode extends vscode.TreeItem {
  readonly kind = 'directory' as const;

  constructor(
    public label: string,
    public children: EasyReviewTreeNode[] = [],
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.iconPath = new vscode.ThemeIcon('folder');
  }
}

/**
 * FileNode — represents a single changed file in the PR (D-01)
 * Opens a diff editor when clicked (easy-review.openFileDiff)
 */
export class FileNode extends vscode.TreeItem {
  readonly kind = 'file' as const;

  constructor(
    public readonly file: PRFileChange,
    pr: StoredPR,
  ) {
    const shortLabel = file.filename.split('/').pop() ?? file.filename;
    super(shortLabel, vscode.TreeItemCollapsibleState.None);

    this.description = file.status === 'renamed' && file.previous_filename
      ? `${file.previous_filename} → ${file.filename}`
      : file.filename;
    this.iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status] ?? 'diff-modified');
    // resourceUri triggers VS Code git decoration colors on the label
    // (green=added, red=removed, orange=modified/renamed) — same mechanism as upstream
    const gitChangeType = STATUS_TO_GIT_CHANGE_TYPE[file.status] ?? GitChangeType.MODIFY;
    this.resourceUri = toResourceUri(
      vscode.Uri.file(file.filename),
      pr.prNumber,
      file.filename,
      gitChangeType,
      file.previous_filename,
    );
    this.command = {
      command: 'easy-review.openFileDiff',
      title: 'Open File Diff',
      arguments: [pr, file],
    };
  }
}

/**
 * LoadingNode — shown while PR file list is being fetched (D-05)
 */
export class LoadingNode extends vscode.TreeItem {
  readonly kind = 'loading' as const;

  constructor() {
    super('Loading files...', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('loading~spin');
  }
}

/**
 * ErrorNode — shown when file list fetch fails (D-07, D-08)
 * Clicking retries the load via easy-review.retryLoadFiles
 */
export class ErrorNode extends vscode.TreeItem {
  readonly kind = 'error' as const;

  constructor(pr: StoredPR) {
    super('Failed to load files \u2014 click to retry', vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
    this.command = {
      command: 'easy-review.retryLoadFiles',
      title: 'Retry Load Files',
      arguments: [pr],
    };
  }
}
