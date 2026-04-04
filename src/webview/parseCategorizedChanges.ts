export interface Category {
  name: string;
  items: string[];
}

/**
 * Parse markdown content with ### heading + bullet structure into Category[].
 * Returns null when no ### headings are found (caller falls back to marked()).
 */
export function parseCategorizedChanges(content: string): Category[] | null {
  const lines = content.split('\n');
  const categories: Category[] = [];
  let current: Category | null = null;

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+)/);
    if (heading) {
      if (current) categories.push(current);
      current = { name: heading[1].trim(), items: [] };
      continue;
    }
    if (current) {
      // Accept - and * bullet variants
      const bullet = line.match(/^\s*[-*]\s+(.+)/);
      if (bullet) {
        current.items.push(bullet[1].trim());
      }
    }
  }
  if (current) categories.push(current);

  return categories.length > 0 ? categories : null;
}
