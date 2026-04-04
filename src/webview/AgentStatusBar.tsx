import React from 'react';
import type { AgentKey, SectionState } from '@shared/types';
import { AgentSlot } from './AgentSlot';

export interface AgentStatusBarProps {
  sections: Partial<Record<AgentKey, SectionState>>;
}

const AGENT_ORDER: AgentKey[] = [
  'prSummarizer',
  'bugRisk',
  'architectureChange',
  'testCoverage',
  'documentation',
  'diagram',
  'businessImpact',
];

const AGENT_DISPLAY_NAMES: Record<AgentKey, string> = {
  prSummarizer:       'PR Summary',
  bugRisk:            'Bug & Risk',
  architectureChange: 'Architecture',
  testCoverage:       'Test Coverage',
  documentation:      'Docs',
  diagram:            'Diagram',
  businessImpact:     'Business Impact',
};

const DEFAULT_STATE: SectionState = { status: 'pending' };

/**
 * Horizontal strip showing all 7 agent slots with live state indicators (D-05).
 * Sits below PanelHeader, above the first CollapsibleSection.
 * Not sticky — scrolls with content.
 */
export function AgentStatusBar({ sections }: AgentStatusBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '8px 32px',
      }}
    >
      {AGENT_ORDER.map((key) => (
        <AgentSlot
          key={key}
          agentKey={key}
          displayName={AGENT_DISPLAY_NAMES[key]}
          state={sections[key] ?? DEFAULT_STATE}
        />
      ))}
    </div>
  );
}
