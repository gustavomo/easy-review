export interface StoredPRData {
  title: string;
  body: string | null;
  author: string;
  state: 'open' | 'closed';
  merged: boolean;
  createdAt: string;
  mergedAt: string | null;
  changedFiles: number;
  additions: number;
  deletions: number;
  htmlUrl: string;
  prNumber: number;
  repoId: string;
}

interface Props {
  pr: StoredPRData;
  vscode: { postMessage(msg: unknown): void; getState(): unknown; setState(state: unknown): void };
}

function formatDate(isoString: string | null): string {
  if (!isoString) { return '—'; }
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function PROverviewPanel({ pr, vscode }: Props): JSX.Element {
  const stateLabel = pr.merged ? 'MERGED' : pr.state === 'open' ? 'OPEN' : 'CLOSED';
  const stateClass = pr.merged ? 'merged' : pr.state;

  return (
    <div style={{
      padding: '20px',
      color: 'var(--vscode-editor-foreground)',
      fontFamily: 'var(--vscode-font-family)',
      fontSize: 'var(--vscode-font-size)',
      maxWidth: '800px',
    }}>
      <style>{`
        .state-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-left: 8px;
          vertical-align: middle;
        }
        .state-open {
          background: #1a7f37;
          color: #ffffff;
        }
        .state-merged {
          background: #8250df;
          color: #ffffff;
        }
        .state-closed {
          background: #cf222e;
          color: #ffffff;
        }
        .stats-bar {
          display: flex;
          gap: 16px;
          margin: 12px 0;
          font-size: 13px;
        }
        .additions {
          color: #3fb950;
          font-weight: 600;
        }
        .deletions {
          color: #f85149;
          font-weight: 600;
        }
        .pr-body pre {
          background: var(--vscode-textCodeBlock-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          padding: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          color: var(--vscode-editor-foreground);
          line-height: 1.5;
        }
        .gh-button {
          margin-top: 16px;
          padding: 6px 14px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 13px;
        }
        .gh-button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        .meta-row {
          color: var(--vscode-descriptionForeground);
          font-size: 13px;
          margin: 4px 0;
        }
        hr {
          border: none;
          border-top: 1px solid var(--vscode-panel-border);
          margin: 16px 0;
        }
      `}</style>

      <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
        <span style={{ color: 'var(--vscode-descriptionForeground)', fontWeight: 400 }}>
          #{pr.prNumber}
        </span>
        {' '}
        {pr.title}
        <span className={`state-badge state-${stateClass}`}>{stateLabel}</span>
      </h2>

      <p className="meta-row">
        by <strong>@{pr.author}</strong>
        {' · '}
        <span>{pr.repoId}</span>
      </p>

      <p className="meta-row">
        Created: {formatDate(pr.createdAt)}
        {pr.merged && pr.mergedAt && (
          <span> · Merged: {formatDate(pr.mergedAt)}</span>
        )}
      </p>

      <div className="stats-bar">
        <span>Files changed: <strong>{pr.changedFiles}</strong></span>
        <span className="additions">+{pr.additions}</span>
        <span className="deletions">-{pr.deletions}</span>
      </div>

      <hr />

      <div className="pr-body">
        <pre>{pr.body || '*(No description)*'}</pre>
      </div>

      <button
        className="gh-button"
        onClick={() => vscode.postMessage({ type: 'openExternal', url: pr.htmlUrl })}
      >
        Open on GitHub
      </button>
    </div>
  );
}
