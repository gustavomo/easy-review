import { describe, it, expect } from 'vitest';
import { parseReview, parseFindingsSection } from '../../easy-review/cli/ReviewParser';

const SIX_SECTION_REVIEW = `
## Executive Summary
This PR adds authentication.

## Categorized Changes
- Auth middleware added

## Key Code Changes
Before: no middleware
After: JWT middleware

## Code Review Findings
[critical] Missing input sanitization on login endpoint
[warning] Token expiry not configurable
[suggestion] Add rate limiting

## Impact Analysis
Low risk change.

## Visual Overview
flowchart LR
  A --> B
`;

describe('ReviewParser', () => {
  it('splits raw output into 6 sections by ## H2 headings', () => {
    const sections = parseReview(SIX_SECTION_REVIEW);
    expect(sections).toHaveLength(6);
    expect(sections[0].title).toBe('Executive Summary');
    expect(sections[5].title).toBe('Visual Overview');
  });

  it('is case-insensitive when matching section headings', () => {
    const raw = '## EXECUTIVE SUMMARY\nfoo\n## FINDINGS\n[warning] bar';
    const sections = parseReview(raw);
    expect(sections[0].title).toBe('EXECUTIVE SUMMARY');
    expect(sections).toHaveLength(2);
  });

  it('falls back to a single raw section when no ## headings are found', () => {
    const sections = parseReview('No headings here at all.');
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Review');
    expect(sections[0].content).toBe('No headings here at all.');
  });

  it('trims whitespace from section content', () => {
    const raw = '## Executive Summary\n\n   Some content   \n\n## Findings\n[suggestion] foo';
    const sections = parseReview(raw);
    expect(sections[0].content).toBe('Some content');
  });

  it('parses Code Review Findings section into critical/warning/suggestion groups', () => {
    const sections = parseReview(SIX_SECTION_REVIEW);
    const findings = sections.find(s => s.title === 'Code Review Findings')?.findings ?? [];
    expect(findings).toHaveLength(3);
    expect(findings[0].severity).toBe('critical');
    expect(findings[1].severity).toBe('warning');
    expect(findings[2].severity).toBe('suggestion');
  });

  it('returns empty findings array when Findings section has no severity markers', () => {
    const findings = parseFindingsSection('No severity markers here.');
    expect(findings).toHaveLength(0);
  });

  it('fires findings parser on old ## Findings heading (backward compat for stored reviews)', () => {
    const raw = '## Findings\n[warning] Some old finding';
    const sections = parseReview(raw);
    expect(sections[0].findings).toBeDefined();
    expect(sections[0].findings).toHaveLength(1);
    expect(sections[0].findings![0].severity).toBe('warning');
  });

  it('fires findings parser on new ## Code Review Findings heading (D-11)', () => {
    const raw = '## Code Review Findings\n[critical] New finding format';
    const sections = parseReview(raw);
    expect(sections[0].findings).toBeDefined();
    expect(sections[0].findings).toHaveLength(1);
    expect(sections[0].findings![0].severity).toBe('critical');
  });
});
