// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react'; // required for JSX in classic mode (tsconfig jsxFactory: React.createElement)

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

function timeAgo(isoString: string | null): string {
  if (!isoString) { return '—'; }
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) { return 'today'; }
    if (days === 1) { return 'yesterday'; }
    if (days < 30) { return `${days} days ago`; }
    const months = Math.floor(days / 30);
    if (months < 12) { return `${months} month${months > 1 ? 's' : ''} ago`; }
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return isoString; }
}

function stateIcon(state: 'open' | 'closed', merged: boolean): string {
  if (merged) { return '⎇'; }
  if (state === 'open') { return '↑'; }
  return '✕';
}

export function PROverviewPanel({ pr, vscode }: Props): JSX.Element {
  const isOpen = !pr.merged && pr.state === 'open';
  const isMerged = pr.merged;
  const stateLabel = isMerged ? 'Merged' : isOpen ? 'Open' : 'Closed';
  const [owner, repo] = pr.repoId.split('/');

  return (
    <div className="overview-root">
      <style>{`
        * { box-sizing: border-box; }

        .overview-root {
          padding: 0;
          color: var(--vscode-editor-foreground);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size, 13px);
          line-height: 1.5;
          max-width: 780px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .pr-header {
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .pr-title-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .pr-number {
          color: var(--vscode-descriptionForeground);
          font-weight: 400;
          font-size: 15px;
          white-space: nowrap;
          padding-top: 1px;
        }
        .pr-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
          color: var(--vscode-editor-foreground);
          flex: 1;
          min-width: 0;
        }
        .state-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .state-open   { background: #1a7f37; color: #fff; }
        .state-merged { background: #8250df; color: #fff; }
        .state-closed { background: #6e7781; color: #fff; }
        .pr-meta {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          margin: 0;
        }
        .pr-meta strong { color: var(--vscode-editor-foreground); }

        /* ── Stats bar ── */
        .stats-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          flex-wrap: wrap;
        }
        .stat { display: flex; align-items: center; gap: 4px; }
        .stat-files { color: var(--vscode-editor-foreground); font-weight: 500; }
        .stat-add  { color: #3fb950; font-weight: 600; }
        .stat-del  { color: #f85149; font-weight: 600; }
        .diff-bar {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        .diff-seg {
          height: 6px;
          border-radius: 2px;
          min-width: 4px;
        }
        .diff-seg-add { background: #3fb950; }
        .diff-seg-del { background: #f85149; }
        .diff-seg-neu { background: var(--vscode-input-border, #555); }

        /* ── Body / Description ── */
        .pr-body-section {
          padding: 16px 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 8px;
        }
        .pr-body-text {
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--vscode-editor-foreground);
          margin: 0;
          background: var(--vscode-textCodeBlock-background, transparent);
          border-radius: 4px;
          padding: 10px 12px;
          border: 1px solid var(--vscode-panel-border);
          max-height: 340px;
          overflow-y: auto;
        }
        .pr-body-empty {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          font-style: italic;
        }

        /* ── Footer ── */
        .pr-footer {
          padding: 12px 20px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-family: inherit;
          font-weight: 500;
        }
        .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
        .repo-badge {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          background: var(--vscode-badge-background);
          border-radius: 10px;
          padding: 2px 8px;
        }
      `}</style>

      {/* Header */}
      <div className="pr-header">
        <div className="pr-title-row">
          <span className="pr-number">#{pr.prNumber}</span>
          <h2 className="pr-title">{pr.title}</h2>
          <span className={`state-pill state-${isMerged ? 'merged' : pr.state}`}>
            {stateIcon(pr.state, isMerged)} {stateLabel}
          </span>
        </div>
        <p className="pr-meta">
          <strong>@{pr.author}</strong>
          {isMerged
            ? <> merged {timeAgo(pr.mergedAt)} · opened {timeAgo(pr.createdAt)}</>
            : <> opened {timeAgo(pr.createdAt)}</>
          }
          {' · '}
          <span>{owner}/{repo}</span>
        </p>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <span className="stat stat-files">
          <span>📄</span>
          <strong>{pr.changedFiles}</strong> {pr.changedFiles === 1 ? 'file' : 'files'} changed
        </span>
        <span className="stat stat-add">+{pr.additions}</span>
        <span className="stat stat-del">−{pr.deletions}</span>
        <DiffBar additions={pr.additions} deletions={pr.deletions} />
      </div>

      {/* Description */}
      <div className="pr-body-section">
        <div className="section-label">Description</div>
        {pr.body
          ? <pre className="pr-body-text">{pr.body}</pre>
          : <p className="pr-body-empty">No description provided.</p>
        }
      </div>

      {/* Footer */}
      <div className="pr-footer">
        <button
          className="btn-primary"
          onClick={() => vscode.postMessage({ type: 'openExternal', url: pr.htmlUrl })}
        >
          ↗ Open on GitHub
        </button>
        <span className="repo-badge">{pr.repoId}</span>
      </div>
    </div>
  );
}

function DiffBar({ additions, deletions }: { additions: number; deletions: number }): JSX.Element {
  const total = additions + deletions;
  if (total === 0) { return <></>; }
  const MAX = 5;
  const addSegs = Math.max(1, Math.round((additions / total) * MAX));
  const delSegs = Math.max(0, Math.min(MAX - addSegs, Math.round((deletions / total) * MAX)));
  const neuSegs = MAX - addSegs - delSegs;
  return (
    <span className="diff-bar">
      {Array.from({ length: addSegs }).map((_, i) => <span key={`a${i}`} className="diff-seg diff-seg-add" />)}
      {Array.from({ length: delSegs }).map((_, i) => <span key={`d${i}`} className="diff-seg diff-seg-del" />)}
      {Array.from({ length: neuSegs }).map((_, i) => <span key={`n${i}`} className="diff-seg diff-seg-neu" />)}
    </span>
  );
}
