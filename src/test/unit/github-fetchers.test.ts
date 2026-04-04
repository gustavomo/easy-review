import { describe, it, expect, vi } from 'vitest';
import { fetchReviewComments, fetchPRCommits } from '../../easy-review/github/DiffFetcher';

// Mirrors the ReviewComment interface that DiffFetcher.ts will export in Plan 02
interface ReviewComment {
  reviewer: string;
  file?: string;
  line?: number;
  body: string;
}

// Octokit mock factory — returns a mock object with all three REST pull endpoints
function makeOctokit(overrides: Partial<{
  listReviewComments: any;
  listReviews: any;
  listCommits: any;
}> = {}) {
  return {
    rest: {
      pulls: {
        listReviewComments: overrides.listReviewComments ?? vi.fn().mockResolvedValue({ data: [] }),
        listReviews: overrides.listReviews ?? vi.fn().mockResolvedValue({ data: [] }),
        listCommits: overrides.listCommits ?? vi.fn().mockResolvedValue({ data: [] }),
      },
    },
  };
}

describe('fetchReviewComments', () => {
  it('returns empty array when no line comments and no review bodies', async () => {
    const octokit = makeOctokit();
    const result = await fetchReviewComments(octokit as any, 'owner', 'repo', 1);
    expect(result).toEqual([]);
  });

  it('maps line-level comment fields: reviewer login, file path, line number, body', async () => {
    const octokit = makeOctokit({
      listReviewComments: vi.fn().mockResolvedValue({
        data: [
          { user: { login: 'alice' }, path: 'src/foo.ts', line: 42, original_line: 40, body: 'Fix this' },
        ],
      }),
    });
    const result: ReviewComment[] = await fetchReviewComments(octokit as any, 'owner', 'repo', 1);
    expect(result).toContainEqual({ reviewer: 'alice', file: 'src/foo.ts', line: 42, body: 'Fix this' });
  });

  it('falls back to original_line when line is null', async () => {
    const octokit = makeOctokit({
      listReviewComments: vi.fn().mockResolvedValue({
        data: [
          { user: { login: 'dave' }, path: 'src/bar.ts', line: null, original_line: 7, body: 'Check this' },
        ],
      }),
    });
    const result: ReviewComment[] = await fetchReviewComments(octokit as any, 'owner', 'repo', 1);
    expect(result).toContainEqual({ reviewer: 'dave', file: 'src/bar.ts', line: 7, body: 'Check this' });
  });

  it('excludes PR-level reviews with empty body (Pitfall 2)', async () => {
    const octokit = makeOctokit({
      listReviews: vi.fn().mockResolvedValue({
        data: [{ user: { login: 'bob' }, body: '   ' }],
      }),
    });
    const result: ReviewComment[] = await fetchReviewComments(octokit as any, 'owner', 'repo', 1);
    expect(result).toEqual([]);
  });

  it('includes PR-level review when body is non-empty', async () => {
    const octokit = makeOctokit({
      listReviews: vi.fn().mockResolvedValue({
        data: [{ user: { login: 'carol' }, body: 'LGTM with nits' }],
      }),
    });
    const result: ReviewComment[] = await fetchReviewComments(octokit as any, 'owner', 'repo', 1);
    expect(result).toContainEqual({ reviewer: 'carol', body: 'LGTM with nits' });
    // PR-level review: no file or line fields
    const carolEntry = result.find(r => r.reviewer === 'carol')!;
    expect(carolEntry.file).toBeUndefined();
    expect(carolEntry.line).toBeUndefined();
  });

  it('calls listReviewComments with per_page: 100 (Pitfall 1)', async () => {
    const listReviewComments = vi.fn().mockResolvedValue({ data: [] });
    const octokit = makeOctokit({ listReviewComments });
    await fetchReviewComments(octokit as any, 'owner', 'repo', 42);
    expect(listReviewComments).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 100 }),
    );
  });
});

describe('fetchPRCommits', () => {
  it('returns empty array when no commits', async () => {
    const octokit = makeOctokit();
    const result = await fetchPRCommits(octokit as any, 'owner', 'repo', 1);
    expect(result).toEqual([]);
  });

  it('extracts subject line only, ignoring multi-line body (Pitfall 6)', async () => {
    const octokit = makeOctokit({
      listCommits: vi.fn().mockResolvedValue({
        data: [
          { commit: { message: 'feat: add auth\n\nLonger body text here' } },
        ],
      }),
    });
    const result = await fetchPRCommits(octokit as any, 'owner', 'repo', 1);
    expect(result).toEqual(['feat: add auth']);
  });

  it('returns array of all subject lines', async () => {
    const octokit = makeOctokit({
      listCommits: vi.fn().mockResolvedValue({
        data: [
          { commit: { message: 'feat: first commit' } },
          { commit: { message: 'fix: second commit' } },
        ],
      }),
    });
    const result = await fetchPRCommits(octokit as any, 'owner', 'repo', 1);
    expect(result).toEqual(['feat: first commit', 'fix: second commit']);
  });

  it('calls listCommits with per_page: 100', async () => {
    const listCommits = vi.fn().mockResolvedValue({ data: [] });
    const octokit = makeOctokit({ listCommits });
    await fetchPRCommits(octokit as any, 'owner', 'repo', 42);
    expect(listCommits).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: 100 }),
    );
  });
});
