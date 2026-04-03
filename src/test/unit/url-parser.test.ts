import { describe, it, expect } from 'vitest';
import { parsePRUrl } from '../../../src/easy-review/github/PRUrlParser';

describe('parsePRUrl', () => {
  it('parses standard GitHub PR URL', () => {
    const result = parsePRUrl('https://github.com/owner/repo/pull/123');
    expect(result).toEqual({ owner: 'owner', repo: 'repo', prNumber: 123 });
  });

  it('parses URL with trailing slash', () => {
    const result = parsePRUrl('https://github.com/owner/repo/pull/123/');
    expect(result).toEqual({ owner: 'owner', repo: 'repo', prNumber: 123 });
  });

  it('parses URL with query params', () => {
    const result = parsePRUrl('https://github.com/owner/repo/pull/123?tab=files');
    expect(result).toEqual({ owner: 'owner', repo: 'repo', prNumber: 123 });
  });

  it('parses cross-repo URL (different from workspace repo)', () => {
    const result = parsePRUrl('https://github.com/microsoft/vscode/pull/456');
    expect(result).toEqual({ owner: 'microsoft', repo: 'vscode', prNumber: 456 });
  });

  it('returns null for non-GitHub URL (GitLab)', () => {
    expect(parsePRUrl('https://gitlab.com/owner/repo/pull/1')).toBeNull();
  });

  it('returns null for GitHub issues URL (not a PR)', () => {
    expect(parsePRUrl('https://github.com/owner/repo/issues/1')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parsePRUrl('')).toBeNull();
  });

  it('returns null for non-numeric PR number', () => {
    expect(parsePRUrl('https://github.com/owner/repo/pull/abc')).toBeNull();
  });

  it('returns null for GitHub URL missing pull segment', () => {
    expect(parsePRUrl('https://github.com/owner/repo')).toBeNull();
  });
});
