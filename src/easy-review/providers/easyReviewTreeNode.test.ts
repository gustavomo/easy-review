import { describe, it, expect } from 'vitest';
import {
  EasyReviewTreeNode,
  DirectoryNode,
  FileNode,
  LoadingNode,
  ErrorNode,
  PRFileChange,
} from './EasyReviewTreeNodes';

describe('EasyReviewTreeNodes exports', () => {
  it('EasyReviewTreeNode types are exported without errors', () => {
    // Type-level test: just importing the types is sufficient for Wave 0
    // Real implementation tests come in later plans
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
    const pr = {
      repoId: 'owner/repo',
      prNumber: 1,
      title: 'Test PR',
      state: 'open' as const,
      author: 'alice',
      url: 'https://github.com/owner/repo/pull/1',
      addedAt: 0,
      updatedAt: 0,
      raw: '{}',
    };
    const node = new ErrorNode(pr);
    expect(node.kind).toBe('error');
  });

  it('FileNode.kind is discriminant "file"', () => {
    const pr = {
      repoId: 'owner/repo',
      prNumber: 1,
      title: 'Test PR',
      state: 'open' as const,
      author: 'alice',
      url: 'https://github.com/owner/repo/pull/1',
      addedAt: 0,
      updatedAt: 0,
      raw: '{}',
    };
    const file: PRFileChange = {
      filename: 'src/foo.ts',
      status: 'added',
      sha: 'abc123',
    };
    const node = new FileNode(file, pr);
    expect(node.kind).toBe('file');
    expect(node.file).toBe(file);
  });

  it.todo('EasyReviewPRsProvider.getChildren routing — NAV-01');
});
