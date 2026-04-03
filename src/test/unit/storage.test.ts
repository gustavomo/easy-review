import { describe, it } from 'vitest';
// StorageAdapter is an interface — test that SQLiteStore satisfies it
// Import will fail until Plan 01-03 creates the files; use dynamic import or .todo()

describe('StorageAdapter interface', () => {
  it.todo('SQLiteStore implements StorageAdapter: initialize()');
  it.todo('SQLiteStore implements StorageAdapter: savePR(pr)');
  it.todo('SQLiteStore implements StorageAdapter: getPRs() returns StoredPR[]');
  it.todo('SQLiteStore implements StorageAdapter: getPR(repoId, prNumber) returns StoredPR | undefined');
  it.todo('SQLiteStore implements StorageAdapter: deletePR(repoId, prNumber) removes record');
  it.todo('SQLiteStore implements StorageAdapter: close() closes DB connection');
});
