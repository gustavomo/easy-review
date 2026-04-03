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
