import { describe, expect, it } from 'vitest';
import { Category, parseCategorizedChanges } from './parseCategorizedChanges';

describe('parseCategorizedChanges', () => {
  it('Test 1 (parse success): parses ### headings and bullet items into Category[]', () => {
    const content = '### Feature\n- item a\n- item b\n### Bug Fix\n- item c';
    const result = parseCategorizedChanges(content);
    expect(result).not.toBeNull();
    expect(result).toEqual<Category[]>([
      { name: 'Feature', items: ['item a', 'item b'] },
      { name: 'Bug Fix', items: ['item c'] },
    ]);
  });

  it('Test 2 (fallback trigger): returns null when content has no ### headings', () => {
    const content = '- just a plain bullet list\n- another item';
    const result = parseCategorizedChanges(content);
    expect(result).toBeNull();
  });

  it('Test 3 (empty content): returns null for empty string', () => {
    const result = parseCategorizedChanges('');
    expect(result).toBeNull();
  });

  it('Test 4 (mixed content with leading text): captures categories only, not leading prose', () => {
    const content = 'Some introductory prose.\nMore text.\n### Refactor\n- item';
    const result = parseCategorizedChanges(content);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]).toEqual({ name: 'Refactor', items: ['item'] });
  });

  it('Test 5 (bullet variants): both - and * bullets are parsed into items array', () => {
    const content = '### Mixed\n- dash item\n* star item';
    const result = parseCategorizedChanges(content);
    expect(result).not.toBeNull();
    expect(result![0].items).toEqual(['dash item', 'star item']);
  });
});
