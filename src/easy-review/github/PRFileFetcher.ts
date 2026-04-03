import type { PRFileChange } from '../providers/EasyReviewTreeNodes';

/**
 * Fetches the list of files changed in a PR from the GitHub REST API.
 * Uses Octokit pulls.listFiles with pagination per_page: 100 (D-06).
 *
 * Note: Octokit TypeScript types do not correctly type all REST endpoints.
 * `(octokit as any)` cast is the accepted workaround — same pattern as DiffFetcher.ts.
 *
 * Per D-06: full pagination (multiple pages) is deferred; 100 covers the
 * vast majority of PRs. Large PRs (>100 files) will only show first 100.
 */
export async function fetchPRFiles(
  octokit: any,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFileChange[]> {
  const response = await (octokit as any).rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100, // Pitfall 5: max page size; full pagination deferred per D-06
  });
  return (response.data as any[]).map(f => ({
    filename: f.filename as string,
    status: f.status as PRFileChange['status'],
    previous_filename: f.previous_filename as string | undefined,
    sha: f.sha as string,
  }));
}
