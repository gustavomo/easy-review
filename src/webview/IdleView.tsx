import React from 'react';

/**
 * Idle state placeholder. Copy from UI-SPEC Copywriting Contract.
 * Vertically centered in content area (D-19 visual hierarchy).
 */
export function IdleView() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', gap: '8px', textAlign: 'center',
      color: 'var(--vscode-descriptionForeground)',
    }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>No review generated yet</h2>
      <p style={{ fontSize: '13px', fontWeight: 400, margin: 0, maxWidth: '360px' }}>
        Right-click any PR in the Easy Review panel and select Generate Review to start.
      </p>
    </div>
  );
}
