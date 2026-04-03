import { describe, it } from 'vitest';

describe('parsePRUrl', () => {
  it.todo('parses https://github.com/owner/repo/pull/123 → {owner, repo, prNumber: 123}');
  it.todo('parses URL with trailing slash');
  it.todo('parses URL with query params');
  it.todo('parses cross-repo URL (different from workspace repo)');
  it.todo('returns null for non-GitHub URL');
  it.todo('returns null for GitHub URL without /pull/ segment');
  it.todo('returns null for empty string');
  it.todo('returns null for PR URL with non-numeric PR number');
});
