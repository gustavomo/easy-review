import { marked } from 'marked';

import { type ImpactLevel, parseImpactAnalysis } from './parseImpactAnalysis';

interface ImpactAnalysisSectionProps {
  content: string;
}

// D-16: impact badge colors
const IMPACT_BADGE_COLORS: Record<string, string> = {
  high:   'var(--vscode-charts-red)',
  medium: 'var(--vscode-list-warningForeground)',
  low:    'var(--vscode-charts-green)',
};

function getImpactColor(level: ImpactLevel): string {
  return level ? (IMPACT_BADGE_COLORS[level] ?? 'var(--vscode-badge-background)') : 'transparent';
}

/**
 * Impact Analysis section (D-14, D-15, D-16, D-17, D-18).
 * Renders each dimension as a labeled block with an impact badge.
 * Shows a warning banner if Breaking Changes dimension has High impact (D-17).
 * Falls back to generic marked() rendering if no ### headings found (D-18).
 */
export function ImpactAnalysisSection({ content }: ImpactAnalysisSectionProps) {
  const parsed = parseImpactAnalysis(content);

  // D-18: fallback when parsing finds no structure
  if (!parsed) {
    return (
      <div
        className="easy-review-md"
        dangerouslySetInnerHTML={{ __html: marked(content) as string }}
      />
    );
  }

  if (parsed.dimensions.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
        No impact analysis available.
      </p>
    );
  }

  return (
    <div>
      {/* D-17: Breaking Changes warning banner — rendered FIRST */}
      {parsed.hasHighBreaking && (
        <div
          style={{
            background: 'var(--vscode-inputValidation-warningBackground, rgba(200,100,0,0.12))',
            borderLeft: '3px solid var(--vscode-list-warningForeground)',
            borderRadius: '0 4px 4px 0',
            padding: '8px 16px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--vscode-list-warningForeground)',
              textTransform: 'uppercase',
            }}
          >
            Breaking Changes
          </span>
        </div>
      )}

      {/* D-15: Dimension blocks */}
      {parsed.dimensions.map((dim) => {
        const badgeColor = getImpactColor(dim.impact);
        return (
          <div key={dim.name} style={{ marginBottom: '16px' }}>
            {/* Dimension header with inline impact badge */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--vscode-editor-foreground)',
                }}
              >
                {dim.name}
              </span>
              {dim.impact && (
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: '8px',
                    background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
                    border: `1px solid ${badgeColor}`,
                    borderRadius: '10px',
                    padding: '1px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: badgeColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {dim.impact}
                </span>
              )}
            </div>
            {/* Dimension bullet items */}
            {dim.items.length > 0 && (
              <ul style={{ margin: '0', paddingLeft: '16px' }}>
                {dim.items.map((item, i) => (
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
            )}
          </div>
        );
      })}
    </div>
  );
}
