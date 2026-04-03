import React, { useState } from 'react';
import { ElapsedCounter } from './ElapsedCounter';
import { HistoryDropdown } from './HistoryDropdown';

interface PanelHeaderProps {
  prTitle: string;
  model?: string;
  isGenerating: boolean;
  historyItems: Array<{ id: number; label: string }>;
  onCancel: () => void;
  onLoadHistory: (id: number) => void;
}

/**
 * Sticky header bar (D-22). Contains: PR title + model badge + elapsed counter (generating) +
 * Cancel Generation button (generating) + history dropdown.
 * Height ~48px. Uses position:sticky, top:0, z-index:200 (matches editorWebview pattern).
 */
export function PanelHeader({ prTitle, model, isGenerating, historyItems, onCancel, onLoadHistory }: PanelHeaderProps) {
  const [startedAt] = useState(() => Date.now());

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 32px',
      background: 'var(--vscode-panel-background)',
      borderBottom: '1px solid var(--vscode-panel-border)',
      gap: '8px',
    }}>
      {/* Left: PR title + model badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: '13px', fontWeight: 400,
          color: 'var(--vscode-editor-foreground)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {prTitle || 'Easy Review'}
        </span>
        {model && (
          <span style={{
            fontSize: '11px', fontWeight: 600,
            color: 'var(--vscode-descriptionForeground)',
            background: 'var(--vscode-badge-background)',
            borderRadius: '4px', padding: '1px 6px',
          }}>
            {model}
          </span>
        )}
      </div>

      {/* Right: elapsed counter + cancel (generating) OR history dropdown (complete) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {isGenerating ? (
          <>
            <ElapsedCounter startedAt={startedAt} />
            {/* Cancel Generation button — secondary with codicon-x icon (UI-SPEC) */}
            <button
              onClick={onCancel}
              aria-label="Cancel review generation"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none', borderRadius: '4px',
                padding: '3px 12px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              <span className="codicon codicon-x" aria-hidden="true" />
              Cancel Generation
            </button>
          </>
        ) : (
          <HistoryDropdown
            items={historyItems}
            onChange={onLoadHistory}
          />
        )}
      </div>
    </div>
  );
}
