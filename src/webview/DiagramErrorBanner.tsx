
/**
 * Warning banner shown inside MermaidDiagram on 3rd validation failure (D-18).
 * Not dismissible — remains visible for the session.
 * Matches the Breaking Changes banner pattern from ImpactAnalysisSection.tsx.
 */
export function DiagramErrorBanner() {
  return (
    <div
      style={{
        borderLeft: '3px solid var(--vscode-list-warningForeground)',
        padding: '8px 12px',
        marginBottom: '8px',
        color: 'var(--vscode-list-warningForeground)',
        fontSize: '13px',
      }}
    >
      <span className="codicon codicon-warning" aria-hidden="true" style={{ marginRight: '6px' }} />
      Diagram failed to render — raw output shown below.
    </div>
  );
}
