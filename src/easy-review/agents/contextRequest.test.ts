import { describe, expect, it } from 'vitest';
import { parseContextRequest } from './contextRequest';

describe('parseContextRequest', () => {
  it('returns defaults when no CONTEXT_REQUEST block present', () => {
    const template = 'Just a plain template with no header block.';
    const result = parseContextRequest(template);
    expect(result.projectAnalysis).toBe(false);
    expect(result.commitHistory).toBe(false);
    expect(result.body).toBe(template);
  });

  it('parses project_analysis: true', () => {
    const body = 'The actual prompt body here.';
    const template = `## CONTEXT_REQUEST\nproject_analysis: true\ncommit_history: false\n---\n${body}`;
    const result = parseContextRequest(template);
    expect(result.projectAnalysis).toBe(true);
    expect(result.commitHistory).toBe(false);
    expect(result.body).toBe(body);
  });

  it('parses commit_history: true', () => {
    const body = 'Prompt body.';
    const template = `## CONTEXT_REQUEST\nproject_analysis: false\ncommit_history: true\n---\n${body}`;
    const result = parseContextRequest(template);
    expect(result.projectAnalysis).toBe(false);
    expect(result.commitHistory).toBe(true);
    expect(result.body).toBe(body);
  });

  it('parses both project_analysis and commit_history as true', () => {
    const body = 'Prompt with both contexts.';
    const template = `## CONTEXT_REQUEST\nproject_analysis: true\ncommit_history: true\n---\n${body}`;
    const result = parseContextRequest(template);
    expect(result.projectAnalysis).toBe(true);
    expect(result.commitHistory).toBe(true);
    expect(result.body).toBe(body);
  });

  it('returns an object with projectAnalysis, commitHistory, and body keys', () => {
    const result = parseContextRequest('simple template');
    expect(result).toHaveProperty('projectAnalysis');
    expect(result).toHaveProperty('commitHistory');
    expect(result).toHaveProperty('body');
  });
});
