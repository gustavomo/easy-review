import type { Octokit } from '@octokit/rest';

/**
 * Fetches the PR unified diff (patch format) from GitHub REST API.
 * Uses the diff media type Accept header via Octokit mediaType option.
 * Per D-11: PR diff is always fetched fresh — not read from SQLite raw field.
 *
 * Note: Octokit TypeScript types do not correctly type the diff format return.
 * `as unknown as string` is the accepted workaround (see RESEARCH.md Pattern 5).
 */
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const response = await (octokit as any).rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  });
  return response.data as unknown as string;
}

export interface ReviewComment {
  reviewer: string;
  file?: string;
  line?: number;
  body: string;
}

/**
 * Fetches all review comments for a PR from GitHub REST API.
 * Combines line-level diff comments (listReviewComments) and PR-level review bodies (listReviews).
 * Per D-05: full detail — reviewer login, file path, line number (when applicable), body.
 * Per D-06: empty/whitespace review bodies are excluded (Pitfall 2 prevention).
 * Note: per_page: 100 without full pagination — sufficient for typical PRs (Pitfall 1).
 */
export async function fetchReviewComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ReviewComment[]> {
  const results: ReviewComment[] = [];

  // Line-level comments (inline diff comments)
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const lineComments = await (octokit as any).rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  for (const c of lineComments.data) {
    results.push({
      reviewer: c.user?.login ?? 'unknown',
      file: c.path,
      line: c.line ?? c.original_line,
      body: c.body,
    });
  }

  // PR-level review summaries (exclude empty/whitespace bodies — Pitfall 2)
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const reviews = await (octokit as any).rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  for (const r of reviews.data) {
    if (r.body?.trim()) {
      results.push({
        reviewer: r.user?.login ?? 'unknown',
        body: r.body,
      });
    }
  }

  return results;
}

/**
 * Fetches commit subject lines for a PR.
 * Per D-08: only the subject line (first line of commit.message) is extracted.
 * Multi-line commit bodies are discarded to avoid inflating the prompt (Pitfall 6).
 */
export async function fetchPRCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string[]> {
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const response = await (octokit as any).rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  // Extract subject line only (first line of commit message) — Pitfall 6
   
  return response.data.map((c: any) => c.commit.message.split('\n')[0]);
}
