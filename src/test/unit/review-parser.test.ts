import { describe, it, expect } from 'vitest';
// import { parseReview } from '../../easy-review/cli/ReviewParser';

describe('ReviewParser', () => {
  // REV-02: 6-section structured format
  it.todo('splits raw output into 6 sections by ## H2 headings');
  it.todo('is case-insensitive when matching section headings');
  it.todo('falls back to a single raw section when no ## headings are found');
  it.todo('trims whitespace from section content');

  // VIEW-02: findings by severity
  it.todo('parses Findings section into critical/warning/suggestion groups');
  it.todo('returns empty findings array when Findings section has no severity markers');
});
