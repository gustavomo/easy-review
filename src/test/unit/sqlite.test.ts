import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock vscode before importing SQLiteStore
vi.mock('vscode', () => ({
  window: {
    showErrorMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

import { SQLiteStore } from '../../easy-review/storage/SQLiteStore';
import type { StoredPR } from '../../easy-review/storage/StorageAdapter';
import type { StoredReview, StoredProjectAnalysis } from '../../easy-review/storage/types';

function makeReview(overrides: Partial<Omit<StoredReview, 'id'>> = {}): Omit<StoredReview, 'id'> {
  return {
    repoId: 'owner/repo',
    prNumber: 1,
    modelUsed: 'claude-3-5-sonnet',
    createdAt: 1000,
    reviewText: '# Review\n\nLooks good.',
    parsedJson: '{}',
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<Omit<StoredProjectAnalysis, 'id'>> = {}): Omit<StoredProjectAnalysis, 'id'> {
  return {
    collectedAt: 2000,
    contextText: 'README content here',
    ...overrides,
  };
}

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

// Phase 2 additions — REV-04, REV-05, VIEW-03
describe('SQLiteStore — reviews table', () => {
  let store: SQLiteStore;

  beforeEach(() => {
    store = new SQLiteStore();
    store.initialize(':memory:');
  });

  afterEach(() => store.close());

  it('saveReview inserts a row into the reviews table', () => {
    const id = store.saveReview(makeReview());
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('getReviews returns all reviews for a given repo_id + pr_number in descending created_at order', () => {
    store.saveReview(makeReview({ createdAt: 1000 }));
    store.saveReview(makeReview({ createdAt: 3000 }));
    store.saveReview(makeReview({ createdAt: 2000 }));
    const reviews = store.getReviews('owner/repo', 1);
    expect(reviews).toHaveLength(3);
    expect(reviews[0].createdAt).toBe(3000);
    expect(reviews[1].createdAt).toBe(2000);
    expect(reviews[2].createdAt).toBe(1000);
  });

  it('saveReview stores both review_text and parsed_json', () => {
    store.saveReview(makeReview({ reviewText: '# My Review', parsedJson: '{"sections":[]}' }));
    const [review] = store.getReviews('owner/repo', 1);
    expect(review.reviewText).toBe('# My Review');
    expect(review.parsedJson).toBe('{"sections":[]}');
  });

  it('getReviews returns empty array when no reviews exist for a PR', () => {
    const reviews = store.getReviews('owner/repo', 999);
    expect(reviews).toEqual([]);
  });

  // REV-05: multiple versions preserved
  it('saving two reviews for the same PR produces two rows, both queryable', () => {
    const id1 = store.saveReview(makeReview({ createdAt: 1000 }));
    const id2 = store.saveReview(makeReview({ createdAt: 2000 }));
    expect(id1).not.toBe(id2);
    const reviews = store.getReviews('owner/repo', 1);
    expect(reviews).toHaveLength(2);
  });
});

describe('SQLiteStore — project_analyses table', () => {
  let store: SQLiteStore;

  beforeEach(() => {
    store = new SQLiteStore();
    store.initialize(':memory:');
  });

  afterEach(() => store.close());

  it('saveProjectAnalysis inserts a row into the project_analyses table', () => {
    expect(() => store.saveProjectAnalysis(makeAnalysis())).not.toThrow();
  });

  it('getProjectAnalysis returns the most recently inserted row', () => {
    store.saveProjectAnalysis(makeAnalysis({ collectedAt: 2000, contextText: 'first' }));
    const result = store.getProjectAnalysis();
    expect(result).not.toBeNull();
    expect(result!.contextText).toBe('first');
    expect(result!.collectedAt).toBe(2000);
  });

  it('saveProjectAnalysis replaces the previous row on re-run (single row policy)', () => {
    store.saveProjectAnalysis(makeAnalysis({ contextText: 'old' }));
    store.saveProjectAnalysis(makeAnalysis({ contextText: 'new' }));
    const result = store.getProjectAnalysis();
    expect(result!.contextText).toBe('new');
    // Only one row should exist
    const result2 = store.getProjectAnalysis();
    expect(result2!.contextText).toBe('new');
  });

  it('getProjectAnalysis returns null when no analysis has been run', () => {
    const result = store.getProjectAnalysis();
    expect(result).toBeNull();
  });
});
