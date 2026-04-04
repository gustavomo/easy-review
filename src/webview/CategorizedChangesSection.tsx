import { marked } from 'marked';

import { parseCategorizedChanges } from './parseCategorizedChanges';

interface CategorizedChangesSectionProps {
  content: string;
}

// D-12: semantic color map for category chips
const CATEGORY_COLORS: Record<string, string> = {
  feature:    'var(--vscode-charts-blue)',
  'bug fix':  'var(--vscode-charts-red)',
  bugfix:     'var(--vscode-charts-red)',
  refactor:   'var(--vscode-charts-purple)',
  test:       'var(--vscode-charts-green)',
  docs:       'var(--vscode-descriptionForeground)',
};

function getCategoryColor(name: string): string {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return 'var(--vscode-badge-background)'; // D-12 unknown/other
}

/**
 * Categorized Changes section (D-10, D-11, D-12, D-13).
 * Parses ### heading + bullet structure into category chips + bullet lists.
 * Falls back to generic marked() rendering if no ### headings found (D-13).
 */
export function CategorizedChangesSection({ content }: CategorizedChangesSectionProps) {
  const categories = parseCategorizedChanges(content);

  // D-13: fallback when parsing finds no structure
  if (!categories) {
    return (
      <div
        className="easy-review-md"
        dangerouslySetInnerHTML={{ __html: marked(content) as string }}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
        No categorized changes available.
      </p>
    );
  }

  return (
    <div>
      {categories.map((cat) => {
        const color = getCategoryColor(cat.name);
        return (
          <div key={cat.name} style={{ marginBottom: '16px' }}>
            {/* D-11: category chip — inline-block badge header */}
            <span
              style={{
                display: 'inline-block',
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                border: `1px solid ${color}`,
                borderRadius: '12px',
                padding: '2px 10px',
                marginBottom: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color,
                textTransform: 'uppercase',
              }}
            >
              {cat.name}
            </span>
            {/* Bullet items below chip */}
            <ul style={{ margin: '0 0 0 0', paddingLeft: '16px' }}>
              {cat.items.map((item, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    lineHeight: '1.6',
                    color: 'var(--vscode-editor-foreground)',
                    margin: '2px 0',
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
