import { describe, expect, it } from 'vitest';
import { Dimension, ParsedImpactAnalysis, parseImpactAnalysis } from './parseImpactAnalysis';

describe('parseImpactAnalysis', () => {
  it('Test 1 (parse success): parses ### heading with High impact keyword and bullet', () => {
    const content = '### Performance\nHigh impact\n- item';
    const result = parseImpactAnalysis(content);
    expect(result).not.toBeNull();
    expect(result).toEqual<ParsedImpactAnalysis>({
      dimensions: [{ name: 'Performance', impact: 'high', items: ['item'] }],
      hasHighBreaking: false,
    });
  });

  it('Test 2 (hasHighBreaking true): Breaking Changes with High impact sets hasHighBreaking=true', () => {
    const content = '### Breaking Changes\nHigh impact\n- removed API';
    const result = parseImpactAnalysis(content);
    expect(result).not.toBeNull();
    expect(result!.hasHighBreaking).toBe(true);
    expect(result!.dimensions[0]).toEqual<Dimension>({
      name: 'Breaking Changes',
      impact: 'high',
      items: ['removed API'],
    });
  });

  it('Test 3 (hasHighBreaking false for low): Breaking Changes with Low impact keeps hasHighBreaking=false', () => {
    const content = '### Breaking Changes\nLow impact\n- minor';
    const result = parseImpactAnalysis(content);
    expect(result).not.toBeNull();
    expect(result!.hasHighBreaking).toBe(false);
  });

  it('Test 4 (medium detection): Security dimension with Medium impact', () => {
    const content = '### Security\nMedium impact\n- item';
    const result = parseImpactAnalysis(content);
    expect(result).not.toBeNull();
    expect(result!.dimensions[0].impact).toBe('medium');
  });

  it('Test 5 (no headings fallback): returns null when content has no ### headings', () => {
    const content = '- just a plain bullet list\n- another item';
    const result = parseImpactAnalysis(content);
    expect(result).toBeNull();
  });

  it('Test 6 (case insensitive impact): HIGH, High, and high all resolve to "high"', () => {
    const contentUpper = '### Dimension\nHIGH impact\n- item';
    const contentTitle = '### Dimension\nHigh impact\n- item';
    const contentLower = '### Dimension\nhigh impact\n- item';

    expect(parseImpactAnalysis(contentUpper)!.dimensions[0].impact).toBe('high');
    expect(parseImpactAnalysis(contentTitle)!.dimensions[0].impact).toBe('high');
    expect(parseImpactAnalysis(contentLower)!.dimensions[0].impact).toBe('high');
  });
});
