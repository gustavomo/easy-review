import * as vscode from 'vscode';
import type { StoredPR } from '../storage/types';

export type PRState = 'open' | 'closed' | 'merged';

// State badge colors following GitHub conventions (D-04)
const STATE_ICON: Record<PRState, { id: string; color: vscode.ThemeColor }> = {
	open:   { id: 'git-pull-request',        color: new vscode.ThemeColor('charts.green') },
	merged: { id: 'git-merge',               color: new vscode.ThemeColor('charts.purple') },
	closed: { id: 'git-pull-request-closed', color: new vscode.ThemeColor('charts.red') },
};

export class PRTreeItem extends vscode.TreeItem {
	constructor(public readonly pr: StoredPR) {
		super(
			`#${pr.prNumber} ${pr.title}`,
			vscode.TreeItemCollapsibleState.None,
		);

		const icon = STATE_ICON[pr.state];
		this.iconPath = new vscode.ThemeIcon(icon.id, icon.color);
		this.description = `@${pr.author}`;
		this.tooltip = `${pr.state.toUpperCase()} — ${pr.url}`;
		this.contextValue = `pr-${pr.state}`;

		// Opening the PR triggers the upstream diff view (PRW-02)
		this.command = {
			command: 'easy-review.openPRDiff',
			title: 'Open PR Diff',
			arguments: [this.pr],
		};
	}
}
