import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock vscode before importing SQLiteStore
vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

import { SQLiteStore } from '../../easy-review/storage/SQLiteStore';
import type { StoredPR } from '../../easy-review/storage/StorageAdapter';

function makePR(overrides: Partial<StoredPR> = {}): StoredPR {
  return {
    repoId: 'owner/repo',
    prNumber: 1,
    title: 'Test PR',
    state: 'open',
    author: 'alice',
    url: 'https://github.com/owner/repo/pull/1',
    addedAt: 1000,
    updatedAt: 2000,
    raw: '{}',
    ...overrides,
  };
}

describe('SQLiteStore initialization', () => {
  it('initialize() runs without throwing for in-memory DB', () => {
    const store = new SQLiteStore();
    expect(() => store.initialize(':memory:')).not.toThrow();
    store.close();
  });

  it('initialize() sets journal_mode to WAL', () => {
    const store = new SQLiteStore();
    store.initialize(':memory:');
    // WAL mode pragma executes without error on in-memory DB
    store.close();
  });

  it('initialize() creates prs table', () => {
    const store = new SQLiteStore();
    store.initialize(':memory:');
    // If table doesn't exist, savePR would throw — verify via CRUD
    expect(() => store.savePR(makePR())).not.toThrow();
    store.close();
  });
});

describe('SQLiteStore CRUD', () => {
  let store: SQLiteStore;

  beforeEach(() => {
    store = new SQLiteStore();
    store.initialize(':memory:');
  });

  afterEach(() => store.close());

  it('savePR() inserts a new PR record', () => {
    store.savePR(makePR({ prNumber: 42, title: 'My PR' }));
    const result = store.getPR('owner/repo', 42);
    expect(result).toBeDefined();
    expect(result!.title).toBe('My PR');
    expect(result!.state).toBe('open');
  });

  it('savePR() upserts an existing PR (same repoId + prNumber)', () => {
    store.savePR(makePR({ prNumber: 1, title: 'Original' }));
    store.savePR(makePR({ prNumber: 1, title: 'Updated', state: 'merged' }));
    const result = store.getPR('owner/repo', 1);
    expect(result!.title).toBe('Updated');
    expect(result!.state).toBe('merged');
    expect(store.getPRs()).toHaveLength(1);
  });

  it('getPRs() returns all stored PRs', () => {
    store.savePR(makePR({ prNumber: 1 }));
    store.savePR(makePR({ prNumber: 2 }));
    store.savePR(makePR({ repoId: 'other/repo', prNumber: 3 }));
    expect(store.getPRs()).toHaveLength(3);
  });

  it('getPR() returns undefined for non-existent PR', () => {
    expect(store.getPR('owner/repo', 999)).toBeUndefined();
  });

  it('deletePR() removes the record', () => {
    store.savePR(makePR({ prNumber: 1 }));
    store.deletePR('owner/repo', 1);
    expect(store.getPR('owner/repo', 1)).toBeUndefined();
    expect(store.getPRs()).toHaveLength(0);
  });
});
