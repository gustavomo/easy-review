import { describe, expect, it } from 'vitest';
import { parseFindingsSection, parseReview } from './ReviewParser';

describe('parseReview', () => {
  it('returns single fallback section when no ## headings found', () => {
    const result = parseReview('some raw text with no headings');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Review');
    expect(result[0].content).toBe('some raw text with no headings');
  });

  it('splits on ## headings and returns sections', () => {
    const raw = '## Executive Summary\nSummary content\n## Findings\n[critical] a bug';
    const result = parseReview(raw);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Executive Summary');
    expect(result[1].title).toBe('Findings');
  });

  it('populates findings for Findings section', () => {
    const raw = '## Findings\n[critical] null pointer\n[warning] slow query';
    const result = parseReview(raw);
    expect(result[0].findings).toBeDefined();
    expect(result[0].findings).toHaveLength(2);
    expect(result[0].findings![0].severity).toBe('critical');
  });
});

describe('parseFindingsSection', () => {
  it('parses critical finding', () => {
    const findings = parseFindingsSection('[critical] missing null check');
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].body).toBe('missing null check');
  });

  it('parses multiple findings with different severities', () => {
    const content = '[critical] bug\n[warning] slow\n[suggestion] improve';
    const findings = parseFindingsSection(content);
    expect(findings).toHaveLength(3);
    expect(findings[0].severity).toBe('critical');
    expect(findings[1].severity).toBe('warning');
    expect(findings[2].severity).toBe('suggestion');
  });

  it('appends continuation lines to previous finding', () => {
    const content = '[warning] main line\n  continuation line';
    const findings = parseFindingsSection(content);
    expect(findings).toHaveLength(1);
    expect(findings[0].body).toContain('continuation line');
  });

  it('returns empty array for empty content', () => {
    expect(parseFindingsSection('')).toHaveLength(0);
  });
});

describe('7-section Phase 6 contract', () => {
  it('parses PR Summary section', () => {
    const result = parseReview('## PR Summary\ncontent1\n## Bug & Risk Analysis\ncontent2');
    expect(result[0].title).toBe('PR Summary');
    expect(result[1].title).toBe('Bug & Risk Analysis');
  });

  it('parses Architecture Changes section', () => {
    const result = parseReview('## Architecture Changes\ncontent');
    expect(result[0].title).toBe('Architecture Changes');
  });

  it('parses Test Coverage section', () => {
    const result = parseReview('## Test Coverage\ncontent');
    expect(result[0].title).toBe('Test Coverage');
  });

  it('parses Documentation Review section', () => {
    const result = parseReview('## Documentation Review\ncontent');
    expect(result[0].title).toBe('Documentation Review');
  });

  it('parses Visual Overview section', () => {
    const result = parseReview('## Visual Overview\n```mermaid\ngraph TD\n  A-->B\n```');
    expect(result[0].title).toBe('Visual Overview');
  });

  it('parses Business Impact section', () => {
    const result = parseReview('## Business Impact\ncontent');
    expect(result[0].title).toBe('Business Impact');
  });

  it('bug section triggers findings parser for Bug & Risk Analysis', () => {
    const result = parseReview('## Bug & Risk Analysis\n[critical] missing null check');
    expect(result[0].findings).toBeDefined();
    expect(result[0].findings).toHaveLength(1);
    expect(result[0].findings![0].severity).toBe('critical');
  });
});
