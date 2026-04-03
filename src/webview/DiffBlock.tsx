import React from 'react';

interface DiffBlockProps {
  before: string;
  after: string;
  language?: string;
}

/**
 * Before/after side-by-side code blocks (D-28).
 * Removed lines: var(--vscode-diffEditor-removedLineBackground)
 * Added lines:   var(--vscode-diffEditor-insertedLineBackground)
 */
export function DiffBlock({ before, after, language = '' }: DiffBlockProps) {
  const codeStyle: React.CSSProperties = {
    display: 'block',
    padding: '8px',
    fontFamily: 'var(--vscode-editor-font-family, monospace)',
    fontSize: '12px',
    lineHeight: '18px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    borderRadius: '4px',
    flex: 1,
    margin: 0,
  };

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      <pre style={{ ...codeStyle, background: 'var(--vscode-diffEditor-removedLineBackground)', flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-list-errorForeground)', display: 'block', marginBottom: '4px' }}>Before</span>
        {before}
      </pre>
      <pre style={{ ...codeStyle, background: 'var(--vscode-diffEditor-insertedLineBackground)', flex: 1 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-gitDecoration-addedResourceForeground)', display: 'block', marginBottom: '4px' }}>After</span>
        {after}
      </pre>
    </div>
  );
}
