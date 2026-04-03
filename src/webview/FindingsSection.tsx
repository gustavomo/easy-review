import type { Finding } from '@shared/types';

import { FindingCard } from './FindingCard';

interface FindingsSectionProps {
  findings: Finding[];
}

/** Groups FindingCard by severity: critical -> warning -> suggestion (D-24, VIEW-02). */
export function FindingsSection({ findings }: FindingsSectionProps) {
  if (findings.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)' }}>
        No findings reported for this review.
      </p>
    );
  }

  const critical = findings.filter(f => f.severity === 'critical');
  const warning = findings.filter(f => f.severity === 'warning');
  const suggestion = findings.filter(f => f.severity === 'suggestion');

  return (
    <div>
      {critical.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {critical.map((f, i) => <FindingCard key={i} finding={f} />)}
        </div>
      )}
      {warning.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {warning.map((f, i) => <FindingCard key={i} finding={f} />)}
        </div>
      )}
      {suggestion.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {suggestion.map((f, i) => <FindingCard key={i} finding={f} />)}
        </div>
      )}
    </div>
  );
}
