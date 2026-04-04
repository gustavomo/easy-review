export type ImpactLevel = 'high' | 'medium' | 'low' | null;

export interface Dimension {
  name: string;
  impact: ImpactLevel;
  items: string[];
}

export interface ParsedImpactAnalysis {
  dimensions: Dimension[];
  hasHighBreaking: boolean;
}

function detectImpact(lines: string[]): ImpactLevel {
  const text = lines.join(' ').toLowerCase();
  if (text.includes('high')) return 'high';
  if (text.includes('medium')) return 'medium';
  if (text.includes('low')) return 'low';
  return null;
}

/**
 * Parse markdown content with ### heading + bullet structure into ParsedImpactAnalysis.
 * Returns null when no ### headings are found (caller falls back to marked()).
 */
export function parseImpactAnalysis(content: string): ParsedImpactAnalysis | null {
  const lines = content.split('\n');
  const dimensions: Dimension[] = [];
  let current: { name: string; bodyLines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const items: string[] = [];
    for (const l of current.bodyLines) {
      const bullet = l.match(/^\s*[-*]\s+(.+)/);
      if (bullet) items.push(bullet[1].trim());
    }
    dimensions.push({
      name: current.name,
      impact: detectImpact(current.bodyLines),
      items,
    });
    current = null;
  };

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+)/);
    if (heading) {
      flush();
      current = { name: heading[1].trim(), bodyLines: [] };
      continue;
    }
    if (current) {
      current.bodyLines.push(line);
    }
  }
  flush();

  if (dimensions.length === 0) return null;

  const hasHighBreaking = dimensions.some(
    d => d.name.toLowerCase().includes('breaking') && d.impact === 'high',
  );

  return { dimensions, hasHighBreaking };
}
