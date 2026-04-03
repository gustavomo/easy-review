import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;  // default: true (UI-SPEC)
}

/**
 * Expandable/collapsible section with chevron icon (D-23).
 * Default: expanded. No accordion — multiple can be open simultaneously.
 * Chevron: codicon-chevron-down (expanded) / codicon-chevron-right (collapsed).
 */
export function CollapsibleSection({ title, children, defaultExpanded = true }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Title row — clickable to toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          width: '100%', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
          color: 'var(--vscode-editor-foreground)',
        }}
      >
        <span
          className={`codicon ${expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`}
          aria-hidden="true"
          style={{ fontSize: '16px', flexShrink: 0 }}
        />
        <span style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.2 }}>{title}</span>
      </button>
      {/* Body — hidden when collapsed */}
      {expanded && (
        <div style={{ padding: '0 0 0 24px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
