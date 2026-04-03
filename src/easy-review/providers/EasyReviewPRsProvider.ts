import * as vscode from 'vscode';
import { PRTreeItem } from './PRTreeItem';
import type { StoredPR } from '../storage/types';

/**
 * Flat list TreeDataProvider for Easy Review's PR list (D-04).
 * Registered alongside (not replacing) the upstream PullRequestsTreeDataProvider.
 * View ID: 'easy-review.prList'
 */
export class EasyReviewPRsProvider implements vscode.TreeDataProvider<PRTreeItem> {
	private _onDidChangeTreeData =
		new vscode.EventEmitter<PRTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private prs: PRTreeItem[] = [];

	getTreeItem(element: PRTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: PRTreeItem): vscode.ProviderResult<PRTreeItem[]> {
		// Flat list — no nesting (D-04)
		if (element) { return []; }
		return this.prs;
	}

	/**
	 * Replace the current list with new StoredPRs and fire a tree refresh.
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
