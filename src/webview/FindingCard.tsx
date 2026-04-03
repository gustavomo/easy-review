import type { Finding } from '@shared/types';
import React from 'react';

interface FindingCardProps {
  finding: Finding;
}

const SEVERITY_COLORS: Record<Finding['severity'], string> = {
  critical: 'var(--vscode-list-errorForeground)',
  warning: 'var(--vscode-list-warningForeground)',
  suggestion: 'var(--vscode-editorInfo-foreground)',
};

/**
 * Single finding. Left border color by severity (D-24).
 * Severity badge uses label typography (11px/600).
 * Body uses body typography (13px/400).
 */
export function FindingCard({ finding }: FindingCardProps) {
  const color = SEVERITY_COLORS[finding.severity];
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      padding: '8px 16px',
      marginBottom: '8px',
      background: 'var(--vscode-editor-background)',
      borderRadius: '0 4px 4px 0',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color, textTransform: 'uppercase' }}>
        {finding.severity}
      </span>
      <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: 400, lineHeight: '18px', color: 'var(--vscode-editor-foreground)' }}>
        {finding.body}
      </p>
    </div>
  );
}
