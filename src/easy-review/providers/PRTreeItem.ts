import * as vscode from 'vscode';
import type { EasyReviewTreeNode } from './EasyReviewTreeNodes';
import type { StoredPR } from '../storage/types';

export type PRState = 'open' | 'closed' | 'merged';

// State badge colors following GitHub conventions (D-04) — used as fallback when no avatar
const STATE_ICON: Record<PRState, { id: string; color: vscode.ThemeColor }> = {
	open:   { id: 'git-pull-request',        color: new vscode.ThemeColor('charts.green') },
	merged: { id: 'git-merge',               color: new vscode.ThemeColor('charts.purple') },
	closed: { id: 'git-pull-request-closed', color: new vscode.ThemeColor('charts.red') },
};

/**
 * Safely extract avatar URL from StoredPR.raw (GitHub API JSON).
 * Returns undefined if raw is invalid JSON, user field is missing,
 * or avatar_url is empty. Per D-05, D-06.
 */
function getAvatarUrl(pr: StoredPR): string | undefined {
	try {
		const raw = JSON.parse(pr.raw);
		const url = raw?.user?.avatar_url;
		return typeof url === 'string' && url.length > 0 ? url : undefined;
	} catch {
		return undefined;
	}
}

export class PRTreeItem extends vscode.TreeItem {
	/** Tracks async file-loading state for this PR's children (D-05, D-07, D-13) */
	public children: EasyReviewTreeNode[] | 'loading' | 'error' | undefined = undefined;

	constructor(public readonly pr: StoredPR, hasReview: boolean = false) {
		super(
			`#${pr.prNumber} ${pr.title}`,
			vscode.TreeItemCollapsibleState.Collapsed,
		);

		const avatarUrl = getAvatarUrl(pr);
		if (avatarUrl) {
			// Append size param for smaller image — GitHub CDN supports ?s=N (Pitfall 4)
			const sized = avatarUrl.includes('?') ? `${avatarUrl}&s=40` : `${avatarUrl}?s=40`;
			this.iconPath = vscode.Uri.parse(sized);
		} else {
			// Fallback to state-colored codicon per D-06
			const icon = STATE_ICON[pr.state];
			this.iconPath = new vscode.ThemeIcon(icon.id, icon.color);
		}
		this.description = `${pr.state} \u00b7 @${pr.author}`;
		this.tooltip = `${pr.state.toUpperCase()} — ${pr.url}`;
		this.contextValue = hasReview ? `pr-${pr.state}-hasReview` : `pr-${pr.state}`;

		// Clicking the PR label opens the PR Overview panel (D-13)
		this.command = {
			command: 'easy-review.openPROverview',
			title: 'Open PR Overview',
			arguments: [this.pr],
		};
	}
}
