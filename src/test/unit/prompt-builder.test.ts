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
    });
    expect(result).toContain('## Project Context\nPROJECT CONTEXT HERE');
    // Project context must appear before pull request section
    expect(result.indexOf('## Project Context')).toBeLessThan(result.indexOf('## Pull Request'));
  });

  it('omits project analysis section when projectAnalysis is null', () => {
    const result = buildPrompt({ pr: basePR, diff: 'diff', projectAnalysis: null });
    expect(result).not.toContain('## Project Context');
  });

  it('includes pr_number, pr_title, author, and description in prompt', () => {
    const result = buildPrompt({ pr: basePR, diff: 'diff', projectAnalysis: null });
    expect(result).toContain('Add authentication');
    expect(result).toContain('alice');
    expect(result).toContain('PR #42');
    expect(result).toContain('Implements JWT auth');
  });

  it('includes the diff text in the prompt body', () => {
    const result = buildPrompt({ pr: basePR, diff: 'diff --git a/foo.ts b/foo.ts', projectAnalysis: null });
    expect(result).toContain('diff --git a/foo.ts b/foo.ts');
  });

  it('instructs the model to use the 6-section structured format', () => {
    const result = buildPrompt({ pr: basePR, diff: 'diff', projectAnalysis: null });
    expect(result).toContain('## Executive Summary');
    expect(result).toContain('## Findings');
    expect(result).toContain('## Mermaid Diagram');
  });

  it('includes commit messages section', () => {
    const result = buildPrompt({ pr: basePR, diff: 'diff', projectAnalysis: null });
    expect(result).toContain('## Commit Messages');
    expect(result).toContain('feat: add JWT middleware');
  });
});
