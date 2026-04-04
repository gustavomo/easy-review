import React from 'react';
import type { AgentKey, SectionState, SectionStatus } from '@shared/types';

export interface AgentSlotProps {
  agentKey: AgentKey;
  displayName: string;
  state: SectionState;
}

const STATE_ICONS: Record<SectionStatus, string> = {
  pending: 'codicon-clock',
  generating: 'codicon-loading',
  complete: 'codicon-check',
  error: 'codicon-error',
};

const STATE_LABELS: Record<SectionStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  complete: 'Complete',
  error: 'Error',
};

function getSlotColors(status: SectionStatus): { background: string; color: string } {
  switch (status) {
    case 'pending':
      return {
        background: 'transparent',
        color: 'var(--vscode-descriptionForeground)',
      };
    case 'generating':
      return {
        background: 'color-mix(in srgb, var(--vscode-badge-background) 15%, transparent)',
        color: 'var(--vscode-editor-foreground)',
      };
    case 'complete':
      return {
        background: 'color-mix(in srgb, var(--vscode-charts-green) 15%, transparent)',
        color: 'var(--vscode-charts-green)',
      };
    case 'error':
      return {
        background: 'color-mix(in srgb, var(--vscode-list-errorForeground) 15%, transparent)',
        color: 'var(--vscode-list-errorForeground)',
      };
  }
}

/**
 * Single agent chip inside AgentStatusBar.
 * Shows agent display name + codicon state icon + state label.
 * Colors and icons vary per SectionStatus (pending/generating/complete/error).
 */
export function AgentSlot({ displayName, state }: AgentSlotProps) {
  const { status } = state;
  const icon = STATE_ICONS[status];
  const label = STATE_LABELS[status];
  const { background, color } = getSlotColors(status);
  const isSpinning = status === 'generating';

  return (
    <div
      title={`${displayName}: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        background,
        color,
      }}
    >
      <span
        className={`codicon ${icon}`}
        aria-hidden="true"
        style={isSpinning ? { animation: 'er-spin 1s linear infinite', display: 'inline-block' } : undefined}
      />
      <span>{displayName}</span>
      <span style={{ opacity: 0.8 }}>{label}</span>
    </div>
  );
}
