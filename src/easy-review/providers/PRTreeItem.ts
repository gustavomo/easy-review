import * as vscode from 'vscode';
import type { StoredPR } from '../storage/types';
import type { EasyReviewTreeNode } from './EasyReviewTreeNodes';

export type PRState = 'open' | 'closed' | 'merged';

// State badge colors following GitHub conventions (D-04)
const STATE_ICON: Record<PRState, { id: string; color: vscode.ThemeColor }> = {
	open:   { id: 'git-pull-request',        color: new vscode.ThemeColor('charts.green') },
	merged: { id: 'git-merge',               color: new vscode.ThemeColor('charts.purple') },
	closed: { id: 'git-pull-request-closed', color: new vscode.ThemeColor('charts.red') },
};

export class PRTreeItem extends vscode.TreeItem {
	/** Tracks async file-loading state for this PR's children (D-05, D-07, D-13) */
	public children: EasyReviewTreeNode[] | 'loading' | 'error' | undefined = undefined;

	constructor(public readonly pr: StoredPR) {
		super(
			`#${pr.prNumber} ${pr.title}`,
			vscode.TreeItemCollapsibleState.Collapsed,
		);

		const icon = STATE_ICON[pr.state];
		this.iconPath = new vscode.ThemeIcon(icon.id, icon.color);
		this.description = `@${pr.author}`;
		this.tooltip = `${pr.state.toUpperCase()} — ${pr.url}`;
		this.contextValue = `pr-${pr.state}`;

		// Clicking the PR label opens the PR Overview panel (D-13)
		this.command = {
			command: 'easy-review.openPROverview',
			title: 'Open PR Overview',
			arguments: [this.pr],
		};
	}
}
