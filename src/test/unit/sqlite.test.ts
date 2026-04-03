import { describe, it } from 'vitest';

describe('SQLiteStore initialization', () => {
  it.todo('initialize() sets journal_mode to WAL');
  it.todo('initialize() runs integrity_check without throwing');
  it.todo('initialize() creates prs table if not exists');
  it.todo('initialize() throws and shows vscode.window.showErrorMessage on ABI mismatch');
});

describe('SQLiteStore CRUD', () => {
  it.todo('savePR() inserts a new PR record');
  it.todo('savePR() updates an existing PR record (upsert)');
  it.todo('getPRs() returns all stored PRs ordered by updated_at desc');
  it.todo('getPR() returns specific PR by repoId + prNumber');
  it.todo('getPR() returns undefined for non-existent PR');
  it.todo('deletePR() removes PR and all associated data');
});
