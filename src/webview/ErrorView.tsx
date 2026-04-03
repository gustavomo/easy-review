import React from 'react';

interface ErrorViewProps {
  message: string;
  onRetry: () => void;
}

/** Error state. Copy from UI-SPEC. Retry Review uses accent button (var(--vscode-button-background)). */
export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '16px', textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--vscode-list-errorForeground)' }}>
        Review generation failed
      </h2>
      <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, color: 'var(--vscode-editor-foreground)', maxWidth: '480px' }}>
        {message}. Check the Output channel for details.
      </p>
      <button
        onClick={onRetry}
        style={{
          background: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none', borderRadius: '4px',
          padding: '3px 12px', cursor: 'pointer', fontSize: '13px',
        }}
      >
        Retry Review
      </button>
    </div>
  );
}
