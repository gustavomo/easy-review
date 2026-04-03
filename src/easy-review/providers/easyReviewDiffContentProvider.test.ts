import { describe, expect, it } from 'vitest';
import { decodeDiffUri, encodeDiffUri } from '../diff/diffUri';

describe('encodeDiffUri / decodeDiffUri round-trip', () => {
  it('round-trips a normal file path', () => {
    const uri = encodeDiffUri(
      'acme-org',
      'my-repo',
      'abc1234def5678',
      'src/easy-review/providers/PRTreeItem.ts',
      '#42 PRTreeItem.ts',
    );
    const decoded = decodeDiffUri(uri);
    expect(decoded.owner).toBe('acme-org');
    expect(decoded.repo).toBe('my-repo');
    expect(decoded.ref).toBe('abc1234def5678');
    expect(decoded.path).toBe('src/easy-review/providers/PRTreeItem.ts');
    expect(decoded.label).toBe('#42 PRTreeItem.ts');
  });

  it('round-trips a label with spaces', () => {
    const uri = encodeDiffUri(
      'owner',
      'repo',
      'deadbeef',
      'src/foo/bar.ts',
      '#42 PRTreeItem.ts (base)',
    );
    const decoded = decodeDiffUri(uri);
    expect(decoded.label).toBe('#42 PRTreeItem.ts (base)');
    expect(decoded.path).toBe('src/foo/bar.ts');
  });

  it('round-trips EMPTY sentinel ref', () => {
    const uri = encodeDiffUri('owner', 'repo', 'EMPTY', 'src/new-file.ts', 'new-file.ts (base)');
    const decoded = decodeDiffUri(uri);
    expect(decoded.ref).toBe('EMPTY');
    expect(decoded.path).toBe('src/new-file.ts');
  });

  it('round-trips a file path with multiple directory levels', () => {
    const uri = encodeDiffUri(
      'org',
      'repo',
      'sha123',
      'src/a/b/c/deep-file.ts',
      'deep-file.ts',
    );
    const decoded = decodeDiffUri(uri);
    expect(decoded.path).toBe('src/a/b/c/deep-file.ts');
  });

  it('round-trips a renamed file path (previous_filename scenario)', () => {
    const uri = encodeDiffUri(
      'org',
      'repo',
      'sha999',
      'src/old-name.ts',
      'old-name.ts (base)',
    );
    const decoded = decodeDiffUri(uri);
    expect(decoded.path).toBe('src/old-name.ts');
    expect(decoded.owner).toBe('org');
    expect(decoded.repo).toBe('repo');
  });

  it('produced URI has scheme easy-review-diff', () => {
    const uri = encodeDiffUri('o', 'r', 'sha', 'file.ts', 'label');
    expect(uri.scheme).toBe('easy-review-diff');
  });

  it('produced URI authority contains owner and repo joined by +', () => {
    const uri = encodeDiffUri('my-owner', 'my-repo', 'sha', 'file.ts', 'label');
    expect(uri.authority).toBe('my-owner+my-repo');
  });
});
