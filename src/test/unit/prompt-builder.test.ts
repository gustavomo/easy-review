import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../easy-review/cli/PromptBuilder';

const basePR = {
  prNumber: 42,
  prTitle: 'Add authentication',
  author: 'alice',
  description: 'Implements JWT auth',
  commitMessages: ['feat: add JWT middleware', 'fix: refresh token expiry'],
};

describe('PromptBuilder', () => {
  it('prepends project analysis context_text when projectAnalysis is provided', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff --git ...',
      projectAnalysis: { id: 1, collectedAt: 0, contextText: 'PROJECT CONTEXT HERE' },
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('## Project Context\nPROJECT CONTEXT HERE');
    // Project context must appear before pull request section
    expect(result.indexOf('## Project Context')).toBeLessThan(result.indexOf('## Pull Request'));
  });

  it('omits project analysis section when projectAnalysis is null', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).not.toContain('## Project Context');
  });

  it('includes pr_number, pr_title, author, and description in prompt', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('Add authentication');
    expect(result).toContain('alice');
    expect(result).toContain('PR #42');
    expect(result).toContain('Implements JWT auth');
  });

  it('includes the diff text in the prompt body', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff --git a/foo.ts b/foo.ts',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('diff --git a/foo.ts b/foo.ts');
  });

  it('instructs the model to use the 6-section structured format', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('## Executive Summary');
    expect(result).toContain('## Code Review Findings');   // was: ## Findings
    expect(result).toContain('## Visual Overview');         // was: ## Mermaid Diagram
  });

  it('includes commit messages section', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('## Commit Messages');
    expect(result).toContain('feat: add JWT middleware');
  });

  it('includes the PR URL in the prompt output (D-04)', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('https://github.com/owner/repo/pull/42');
  });

  it('renders "No review comments on this PR." when reviewComments is empty (D-07)', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('No review comments on this PR.');
  });

  it('renders review comments flat list with reviewer, location, and body (D-06)', () => {
    const result = buildPrompt({
      pr: basePR,
      diff: 'diff',
      projectAnalysis: null,
      reviewComments: [
        { reviewer: 'alice', file: 'src/auth.ts', line: 10, body: 'Fix this null check' },
        { reviewer: 'bob', body: 'LGTM with nits' },
      ],
      prUrl: 'https://github.com/owner/repo/pull/42',
    });
    expect(result).toContain('alice');
    expect(result).toContain('src/auth.ts:10');
    expect(result).toContain('Fix this null check');
    expect(result).toContain('bob');
    expect(result).toContain('(PR-level)');
    expect(result).toContain('LGTM with nits');
  });
});
