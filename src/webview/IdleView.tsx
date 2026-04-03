import React from 'react';

interface IdleViewProps {
  onAnalyzeProject?: () => void;
  hasAnalysis?: boolean;
  onViewAnalysis?: () => void;
}

/**
 * Idle state placeholder. Vertically centered with an Analyze Project shortcut button.
 */
export function IdleView({ onAnalyzeProject, hasAnalysis, onViewAnalysis }: IdleViewProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '16px', textAlign: 'center',
      color: 'var(--vscode-descriptionForeground)',
    }}>
      <span className="codicon codicon-eye" aria-hidden="true" style={{ fontSize: '32px', opacity: 0.4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--vscode-editor-foreground)' }}>
          No review generated yet
        </h2>
        <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, maxWidth: '360px' }}>
          Right-click any PR in the Easy Review panel and select{' '}
          <strong>Generate Review</strong> to start.
        </p>
      </div>
      {onAnalyzeProject && (
        <button
          onClick={onAnalyzeProject}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none', borderRadius: '4px',
            padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
          }}
        >
          <span className="codicon codicon-graph" aria-hidden="true" />
          Analyze Project
        </button>
      )}
      {hasAnalysis && onViewAnalysis && (
        <button
          onClick={onViewAnalysis}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none', borderRadius: '4px',
            padding: '6px 14px', cursor: 'pointer', fontSize: '13px',
          }}
        >
          <span className="codicon codicon-book" aria-hidden="true" />
          View Last Analysis
        </button>
      )}
    </div>
  );
}
