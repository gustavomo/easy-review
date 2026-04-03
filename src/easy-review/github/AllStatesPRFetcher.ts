import type { Octokit } from '@octokit/rest';

export interface FetchedPR {
	number: number;
	title: string;
	state: 'open' | 'closed' | 'merged';
	author: string;
	url: string;
	updatedAt: string;
	mergedAt: string | null;
	raw: object;
}

export interface FetchOptions {
	owner: string;
	repo: string;
	perPage?: number;
	page?: number;
}

/**
 * Fetches PRs in ALL states (open, closed, merged) from the GitHub REST API.
 * GitHub's REST API does not have state:'merged' — merged PRs are state:'closed'
 * with merged_at !== null. We normalize this here.
 *
 * New class, not a modification to upstream PullRequestManager (D-02).
 */
export async function fetchAllStatePRs(
	octokit: Octokit,
	opts: FetchOptions
): Promise<FetchedPR[]> {
	const { data } = await octokit.rest.pulls.list({
		owner: opts.owner,
		repo: opts.repo,
		state: 'all',              // returns open + closed (+ merged as closed with merged_at set)
		per_page: opts.perPage ?? 50,
		page: opts.page ?? 1,
		sort: 'updated',
		direction: 'desc',
	});

	return data.map(pr => ({
		number: pr.number,
		title: pr.title,
		state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
		author: pr.user?.login ?? '',
		url: pr.html_url,
		updatedAt: pr.updated_at,
		mergedAt: pr.merged_at ?? null,
		raw: pr,
	}));
}

/**
 * Fetches a single PR by number — used by "Add by URL" command (D-05).
 */
export async function fetchPRByNumber(
	octokit: Octokit,
	owner: string,
	repo: string,
	prNumber: number
): Promise<FetchedPR> {
	const { data: pr } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: prNumber,
	});

	return {
		number: pr.number,
		title: pr.title,
		state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
		author: pr.user?.login ?? '',
		url: pr.html_url,
		updatedAt: pr.updated_at,
		mergedAt: pr.merged_at ?? null,
		raw: pr,
	};
}
