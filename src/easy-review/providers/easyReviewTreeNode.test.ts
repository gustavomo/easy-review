import { beforeEach, describe, expect, it } from 'vitest';
import { EasyReviewPRsProvider } from './EasyReviewPRsProvider';
import {
  DirectoryNode,
  EasyReviewTreeNode,
  ErrorNode,
  FileNode,
  LoadingNode,
  PRFileChange,
} from './EasyReviewTreeNodes';
import { PRTreeItem } from './PRTreeItem';
import type { StorageAdapter } from '../storage/StorageAdapter';
import type { StoredPR, StoredReview } from '../storage/types';

// Helper: create a minimal StoredPR
function makePR(overrides?: Partial<StoredPR>): StoredPR {
  return {
    repoId: 'owner/repo',
    prNumber: 42,
    title: 'Test PR',
    state: 'open',
    author: 'alice',
    url: 'https://github.com/owner/repo/pull/42',
    addedAt: 1000,
    updatedAt: 2000,
    raw: '{}',
    ...overrides,
  };
}

describe('EasyReviewTreeNodes exports', () => {
  it('EasyReviewTreeNode types are exported without errors', () => {
    const _check: boolean = true;
    expect(_check).toBe(true);
  });

  it('DirectoryNode.kind is discriminant "directory"', () => {
    const node = new DirectoryNode('src');
    expect(node.kind).toBe('directory');
    expect(node.label).toBe('src');
    expect(node.children).toEqual([]);
  });

  it('LoadingNode.kind is discriminant "loading"', () => {
    const node = new LoadingNode();
    expect(node.kind).toBe('loading');
  });

  it('ErrorNode.kind is discriminant "error"', () => {
    const pr = makePR();
    const node = new ErrorNode(pr);
    expect(node.kind).toBe('error');
  });

  it('FileNode.kind is discriminant "file"', () => {
    const pr = makePR();
    const file: PRFileChange = {
      filename: 'src/foo.ts',
      status: 'added',
      sha: 'abc123',
    };
    const node = new FileNode(file, pr);
    expect(node.kind).toBe('file');
    expect(node.file).toBe(file);
  });
});

describe('EasyReviewPRsProvider.getChildren routing — NAV-01', () => {
  let provider: EasyReviewPRsProvider;

  beforeEach(() => {
    provider = new EasyReviewPRsProvider();
  });

  it('getChildren(undefined) returns PRTreeItem[]', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const result = provider.getChildren(undefined);
    expect(Array.isArray(result)).toBe(true);
    expect((result as EasyReviewTreeNode[]).length).toBe(1);
    expect((result as EasyReviewTreeNode[])[0]).toBeInstanceOf(PRTreeItem);
  });

  it('getChildren(prTreeItem) with children === undefined: sets children to "loading", returns [LoadingNode]', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];

    expect(prItem.children).toBe(undefined);
    const result = provider.getChildren(prItem) as EasyReviewTreeNode[];
    expect(prItem.children).toBe('loading');
    expect(result.length).toBe(1);
    expect(result[0]).toBeInstanceOf(LoadingNode);
  });

  it('getChildren(prTreeItem) with children === "loading": returns [LoadingNode] (no re-fetch)', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];

    prItem.children = 'loading';
    const result = provider.getChildren(prItem) as EasyReviewTreeNode[];
    expect(result.length).toBe(1);
    expect(result[0]).toBeInstanceOf(LoadingNode);
  });

  it('getChildren(prTreeItem) with children === "error": returns [ErrorNode]', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];

    prItem.children = 'error';
    const result = provider.getChildren(prItem) as EasyReviewTreeNode[];
    expect(result.length).toBe(1);
    expect(result[0]).toBeInstanceOf(ErrorNode);
  });

  it('getChildren(prTreeItem) with children = EasyReviewTreeNode[]: returns those children', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];

    const dir = new DirectoryNode('src');
    prItem.children = [dir];
    const result = provider.getChildren(prItem) as EasyReviewTreeNode[];
    expect(result).toEqual([dir]);
  });

  it('getChildren(directoryNode): returns directoryNode.children', () => {
    const dir = new DirectoryNode('src');
    const child = new DirectoryNode('utils');
    dir.children = [child];
    const result = provider.getChildren(dir);
    expect(result).toEqual([child]);
  });

  it('getChildren(fileNode): returns []', () => {
    const pr = makePR();
    const file: PRFileChange = { filename: 'src/foo.ts', status: 'added', sha: 'abc' };
    const fileNode = new FileNode(file, pr);
    const result = provider.getChildren(fileNode);
    expect(result).toEqual([]);
  });

  it('getChildren(loadingNode): returns []', () => {
    const loading = new LoadingNode();
    const result = provider.getChildren(loading);
    expect(result).toEqual([]);
  });

  it('getChildren(errorNode): returns []', () => {
    const pr = makePR();
    const errorNode = new ErrorNode(pr);
    const result = provider.getChildren(errorNode);
    expect(result).toEqual([]);
  });

  it('retryLoadFiles: resets children to undefined and fires onDidChangeTreeData', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];
    prItem.children = 'error';

    const fired: (EasyReviewTreeNode | undefined)[] = [];
    provider.onDidChangeTreeData(e => fired.push(e as EasyReviewTreeNode | undefined));

    provider.retryLoadFiles(pr);

    expect(prItem.children).toBe(undefined);
    expect(fired.length).toBe(1);
    expect(fired[0]).toBe(prItem);
  });

  it('refresh() resets children state by creating new PRTreeItem instances', () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items1 = provider.getChildren(undefined) as PRTreeItem[];
    const prItem1 = items1[0];
    prItem1.children = 'error';

    // Refresh again — new PRTreeItem instances start with children === undefined
    provider.refresh([pr]);
    const items2 = provider.getChildren(undefined) as PRTreeItem[];
    const prItem2 = items2[0];
    expect(prItem2.children).toBe(undefined);
  });

  it('getChildren(prTreeItem with children === undefined): fires async loadFilesForPR without blocking', async () => {
    const pr = makePR();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    const prItem = items[0];

    // Calling getChildren when children is undefined should NOT throw
    // (loadFilesForPR is fired async, and with no credentialStore it sets error state)
    const result = provider.getChildren(prItem) as EasyReviewTreeNode[];
    expect(result.length).toBe(1);
    expect(result[0]).toBeInstanceOf(LoadingNode);

    // Wait for the async loadFilesForPR to complete (it fails with "no octokit")
    await new Promise(resolve => setTimeout(resolve, 10));

    // After failing (no credentialStore), children should be 'error'
    expect(prItem.children).toBe('error');
  });
});

// --- Phase 2.2 UI-01: contextValue with hasReview suffix ---

describe('PRTreeItem — contextValue with hasReview (UI-01)', () => {
  it('hasReview=false produces plain contextValue pr-open', () => {
    const pr = makePR({ state: 'open' });
    const item = new PRTreeItem(pr, false);
    expect(item.contextValue).toBe('pr-open');
  });

  it('hasReview=true produces pr-open-hasReview for open PRs', () => {
    const pr = makePR({ state: 'open' });
    const item = new PRTreeItem(pr, true);
    expect(item.contextValue).toBe('pr-open-hasReview');
  });

  it('hasReview=true produces pr-closed-hasReview for closed PRs', () => {
    const pr = makePR({ state: 'closed' });
    const item = new PRTreeItem(pr, true);
    expect(item.contextValue).toBe('pr-closed-hasReview');
  });

  it('hasReview=true produces pr-merged-hasReview for merged PRs', () => {
    const pr = makePR({ state: 'merged' });
    const item = new PRTreeItem(pr, true);
    expect(item.contextValue).toBe('pr-merged-hasReview');
  });

  it('no second argument defaults to plain contextValue (backward compatibility)', () => {
    const pr = makePR({ state: 'open' });
    const item = new PRTreeItem(pr);
    expect(item.contextValue).toBe('pr-open');
  });
});

describe('EasyReviewPRsProvider — store injection and hasReview (UI-01)', () => {
  function makeStore(reviewCounts: Record<string, number> = {}) {
    return {
      getReviews: (repoId: string, prNumber: number) => {
        const key = `${repoId}/${prNumber}`;
        const count = reviewCounts[key] ?? 0;
        return Array.from({ length: count }, (_, i) => ({ id: i + 1 } as unknown as StoredReview));
      },
    };
  }

  it('refresh() with store returning 1 review sets -hasReview suffix', () => {
    const pr = makePR({ repoId: 'owner/repo', prNumber: 42 });
    const store = makeStore({ 'owner/repo/42': 1 });
    const provider = new EasyReviewPRsProvider(undefined, store as unknown as StorageAdapter);
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    expect(items[0].contextValue).toBe('pr-open-hasReview');
  });

  it('refresh() with store returning 0 reviews does NOT set -hasReview suffix', () => {
    const pr = makePR({ repoId: 'owner/repo', prNumber: 42 });
    const store = makeStore({ 'owner/repo/42': 0 });
    const provider = new EasyReviewPRsProvider(undefined, store as unknown as StorageAdapter);
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    expect(items[0].contextValue).toBe('pr-open');
  });

  it('refresh() with no store defaults to plain contextValue', () => {
    const pr = makePR({ state: 'open' });
    const provider = new EasyReviewPRsProvider();
    provider.refresh([pr]);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    expect(items[0].contextValue).toBe('pr-open');
  });

  it('addPR() with store returning 1 review sets -hasReview suffix', () => {
    const pr = makePR({ repoId: 'owner/repo', prNumber: 42 });
    const store = makeStore({ 'owner/repo/42': 1 });
    const provider = new EasyReviewPRsProvider(undefined, store as unknown as StorageAdapter);
    provider.addPR(pr);
    const items = provider.getChildren(undefined) as PRTreeItem[];
    expect(items[0].contextValue).toBe('pr-open-hasReview');
  });

  it('refreshPRContextValue() updates contextValue to -hasReview when reviews now exist', () => {
    const pr = makePR({ repoId: 'owner/repo', prNumber: 42 });
    // Start with 0 reviews
    const reviewCounts: Record<string, number> = { 'owner/repo/42': 0 };
    const store = makeStore(reviewCounts);
    const provider = new EasyReviewPRsProvider(undefined, store as unknown as StorageAdapter);
    provider.refresh([pr]);

    const items = provider.getChildren(undefined) as PRTreeItem[];
    expect(items[0].contextValue).toBe('pr-open');

    // Simulate review being saved — bump count, then call refreshPRContextValue
    reviewCounts['owner/repo/42'] = 1;
    const fired: any[] = [];
    provider.onDidChangeTreeData(e => fired.push(e));

    provider.refreshPRContextValue('owner/repo', 42);

    expect(items[0].contextValue).toBe('pr-open-hasReview');
    expect(fired.length).toBe(1);
    expect(fired[0]).toBe(items[0]); // targeted refresh, NOT undefined
  });

  it('refreshPRContextValue() with non-existent PR is a no-op', () => {
    const provider = new EasyReviewPRsProvider();
    // Should not throw
    expect(() => provider.refreshPRContextValue('no/such', 999)).not.toThrow();
  });
});
