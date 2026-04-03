import { describe, expect, it } from 'vitest';
import { buildDirectoryTree } from './directoryTree';
import { DirectoryNode, FileNode, type PRFileChange } from '../providers/EasyReviewTreeNodes';
import type { StoredPR } from '../storage/types';

const makePR = (): StoredPR => ({
  repoId: 'owner/repo',
  prNumber: 42,
  title: 'Test PR',
  state: 'open',
  author: 'alice',
  url: 'https://github.com/owner/repo/pull/42',
  addedAt: 0,
  updatedAt: 0,
  raw: '{}',
});

const makeFile = (filename: string, status: PRFileChange['status'] = 'modified'): PRFileChange => ({
  filename,
  status,
  sha: 'abc',
});

describe('buildDirectoryTree', () => {
  it('returns empty array for empty input', () => {
    const result = buildDirectoryTree([], makePR());
    expect(result).toEqual([]);
  });

  it('single root-level file returns FileNode (no directory wrapper)', () => {
    const result = buildDirectoryTree([makeFile('foo.ts')], makePR());
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(FileNode);
    const fn = result[0] as FileNode;
    expect(fn.file.filename).toBe('foo.ts');
  });

  it('single nested file returns DirectoryNode wrapping FileNode', () => {
    const result = buildDirectoryTree([makeFile('src/foo.ts')], makePR());
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(DirectoryNode);
    const dir = result[0] as DirectoryNode;
    expect(dir.label).toBe('src');
    expect(dir.children).toHaveLength(1);
    expect(dir.children[0]).toBeInstanceOf(FileNode);
  });

  it('two files in same directory returns one DirectoryNode with two FileNodes', () => {
    const result = buildDirectoryTree(
      [makeFile('src/a.ts'), makeFile('src/b.ts')],
      makePR(),
    );
    expect(result).toHaveLength(1);
    const dir = result[0] as DirectoryNode;
    expect(dir).toBeInstanceOf(DirectoryNode);
    expect(dir.label).toBe('src');
    expect(dir.children).toHaveLength(2);
    expect(dir.children[0]).toBeInstanceOf(FileNode);
    expect(dir.children[1]).toBeInstanceOf(FileNode);
  });

  it('compacts single-child directory nodes (path compaction)', () => {
    // src/foo has only one child a.ts, so it should compact to "src/foo"
    const result = buildDirectoryTree([makeFile('src/foo/a.ts')], makePR());
    expect(result).toHaveLength(1);
    const dir = result[0] as DirectoryNode;
    expect(dir).toBeInstanceOf(DirectoryNode);
    expect(dir.label).toBe('src/foo');
    expect(dir.children).toHaveLength(1);
    expect(dir.children[0]).toBeInstanceOf(FileNode);
  });

  it('does NOT compact when directory has multiple children', () => {
    const result = buildDirectoryTree(
      [makeFile('src/a.ts'), makeFile('src/b.ts')],
      makePR(),
    );
    const dir = result[0] as DirectoryNode;
    // 'src' should remain as 'src' — not compacted since it has 2 children
    expect(dir.label).toBe('src');
  });

  it('sorts directories before files, both alphabetically within group', () => {
    const result = buildDirectoryTree(
      [
        makeFile('z.ts'),
        makeFile('a.ts'),
        makeFile('lib/c.ts'),
        makeFile('lib/a.ts'),
        makeFile('src/b.ts'),
      ],
      makePR(),
    );
    // root level: lib dir, src dir, then a.ts, z.ts (dirs before files)
    expect(result[0]).toBeInstanceOf(DirectoryNode);
    expect(result[1]).toBeInstanceOf(DirectoryNode);
    expect(result[2]).toBeInstanceOf(FileNode);
    expect(result[3]).toBeInstanceOf(FileNode);

    const dirs = result.filter(n => n instanceof DirectoryNode) as DirectoryNode[];
    expect(dirs[0].label).toBe('lib');
    expect(dirs[1].label).toBe('src');

    const files = result.filter(n => n instanceof FileNode) as FileNode[];
    expect(files[0].file.filename).toBe('a.ts');
    expect(files[1].file.filename).toBe('z.ts');
  });

  it('preserves file status on FileNode', () => {
    const result = buildDirectoryTree(
      [makeFile('foo.ts', 'added'), makeFile('bar.ts', 'removed')],
      makePR(),
    );
    const fileNodes = result.filter(n => n instanceof FileNode) as FileNode[];
    const statuses = fileNodes.map(fn => fn.file.status);
    expect(statuses).toContain('added');
    expect(statuses).toContain('removed');
  });

  it('all FileNodes have kind === "file"', () => {
    const result = buildDirectoryTree(
      [makeFile('src/a.ts', 'added'), makeFile('src/b.ts', 'renamed')],
      makePR(),
    );
    const dir = result[0] as DirectoryNode;
    dir.children.forEach(child => {
      expect((child as FileNode).kind).toBe('file');
    });
  });
});
