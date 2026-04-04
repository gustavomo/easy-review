
export interface SectionPendingPlaceholderProps {
  copy?: string;
}

/**
 * Placeholder rendered in a CollapsibleSection while the agent is still running.
 * Default copy: "Generating..."
 * Override copy for diagram retry: "Validating diagram..."
 * Uses the shared er-spin @keyframes from webview.css.
 */
export function SectionPendingPlaceholder({ copy }: SectionPendingPlaceholderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
        color: 'var(--vscode-descriptionForeground)',
      }}
    >
      <span
        className="codicon codicon-loading"
        aria-hidden="true"
        style={{ animation: 'er-spin 1s linear infinite', display: 'inline-block' }}
      />
      <span style={{ fontSize: '13px' }}>{copy ?? 'Generating...'}</span>
    </div>
  );
}
