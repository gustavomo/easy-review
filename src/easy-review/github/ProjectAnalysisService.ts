import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Octokit } from '@octokit/core';

/**
 * Collects project context for AI review prompt injection (PROJ-01, D-31, D-32).
 * Reads: README.md + package.json + top-level src/ listing + last 20 git log entries.
 * Concatenates into a single context_text blob stored in SQLite.
 *
 * Pitfall 5 prevention: caller must check vscode.workspace.workspaceFolders before calling.
 */
export async function collectProjectContext(workspaceRoot: string): Promise<string> {
  const parts: string[] = [];

  // README.md (D-32)
  const readmePath = path.join(workspaceRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      parts.push('## README\n' + fs.readFileSync(readmePath, 'utf8'));
    } catch { /* skip if unreadable */ }
  }

  // package.json (D-32)
  const pkgPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      parts.push('## package.json\n' + fs.readFileSync(pkgPath, 'utf8'));
    } catch { /* skip if unreadable */ }
  }

  // top-level src/ directory listing (D-32)
  const srcPath = path.join(workspaceRoot, 'src');
  if (fs.existsSync(srcPath)) {
    try {
      const entries = fs.readdirSync(srcPath);
      parts.push('## src/ structure\n' + entries.join('\n'));
    } catch { /* skip if unreadable */ }
  }

  // Last 20 git log entries (D-32)
  const gitLog = await runGitLog(workspaceRoot, 20);
  if (gitLog) {
    parts.push('## Recent commits\n' + gitLog);
  }

  return parts.join('\n\n---\n\n');
}

function runGitLog(cwd: string, count: number): Promise<string> {
  return new Promise((resolve) => {
    cp.exec(
      `git log --oneline --format="%h %an %ad %s" --date=short -n ${count}`,
      { cwd },
      (err, stdout) => resolve(err ? '' : stdout.trim()),
    );
  });
}

/**
 * Fetches last 100 PR titles + descriptions + dates via GitHub API (PROJ-02, D-37).
 * Appended to project_analyses.context_text as a separate section.
 */
export async function fetchPRHistory(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<string> {
  const response = await (octokit as any).rest.pulls.list({
    owner,
    repo,
    state: 'all',
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  });

  const prs: Array<{ number: number; title: string; body: string | null; merged_at: string | null; created_at: string }> = response.data;

  const lines = prs.map((pr) => {
    const date = pr.merged_at ?? pr.created_at;
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'unknown';
    const body = pr.body ? pr.body.slice(0, 200).replace(/\n/g, ' ') : '(no description)';
    return `- #${pr.number} [${dateStr}] ${pr.title}: ${body}`;
  });

  return '## PR History (last 100)\n' + lines.join('\n');
}
