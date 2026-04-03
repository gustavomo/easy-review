export interface ParsedPRUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

/**
 * Parses a GitHub Pull Request URL into its components.
 * Supports: https://github.com/{owner}/{repo}/pull/{number}
 * Also handles: trailing slashes, query strings, hash fragments.
 * Returns null for any non-matching input.
 *
 * Used by the "Add PR by URL" command (D-05) to support cross-repo PRs.
 */
export function parsePRUrl(url: string): ParsedPRUrl | null {
  if (!url || typeof url !== 'string') return null;

  const match = url.trim().match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) return null;

  const prNumber = parseInt(match[3], 10);
  if (isNaN(prNumber) || prNumber <= 0) return null;

  return {
    owner: match[1],
    repo: match[2],
    prNumber,
  };
}
