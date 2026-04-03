import { describe, it, expect } from 'vitest';
import type { StorageAdapter } from '../../easy-review/storage/StorageAdapter';
import type { StoredPR } from '../../easy-review/storage/types';

describe('StorageAdapter interface', () => {
  it('StoredPR type has required fields', () => {
    // Type-level test: verify the shape compiles
    const pr: StoredPR = {
      repoId: 'owner/repo',
      prNumber: 1,
      title: 'Test PR',
      state: 'open',
      author: 'alice',
      url: 'https://github.com/owner/repo/pull/1',
      addedAt: Date.now(),
      updatedAt: Date.now(),
      raw: '{}',
    };
    expect(pr.repoId).toBe('owner/repo');
    expect(pr.prNumber).toBe(1);
    expect(['open', 'closed', 'merged']).toContain(pr.state);
  });

  it.todo('SQLiteStore implements StorageAdapter: initialize()');
  it.todo('SQLiteStore implements StorageAdapter: savePR(pr)');
  it.todo('SQLiteStore implements StorageAdapter: getPRs() returns StoredPR[]');
  it.todo('SQLiteStore implements StorageAdapter: getPR(repoId, prNumber) returns StoredPR | undefined');
  it.todo('SQLiteStore implements StorageAdapter: deletePR(repoId, prNumber) removes record');
  it.todo('SQLiteStore implements StorageAdapter: close() closes DB connection');
});
