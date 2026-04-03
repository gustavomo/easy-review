import type { StoredProjectAnalysis } from '../storage/types';

export interface PRMetadata {
  prNumber: number;
  prTitle: string;
  author: string;
  description: string;
  commitMessages: string[];
}

export interface BuildPromptOptions {
  pr: PRMetadata;
  diff: string;
  projectAnalysis: StoredProjectAnalysis | null;  // D-09: prepended when available
}

/**
 * Assembles the full review prompt for Claude/Codex CLI.
 * Per D-07: one shared template for both CLIs — same 6-section output contract.
 * Per D-08: prompt content is fixed — no user editing.
 * Per D-09: project analysis is prepended automatically when present.
 */
export function buildPrompt(opts: BuildPromptOptions): string {
  const parts: string[] = [];

  // Project analysis context (D-09) — prepended when available
  if (opts.projectAnalysis) {
    parts.push(`## Project Context\n${opts.projectAnalysis.contextText}`);
  }

  // PR metadata
  parts.push(
    `## Pull Request\nTitle: ${opts.pr.prTitle}\nAuthor: ${opts.pr.author}\nPR #${opts.pr.prNumber}\n\n${opts.pr.description || '(no description)'}`,
  );

  // Commit messages
  if (opts.pr.commitMessages.length > 0) {
    parts.push(`## Commit Messages\n${opts.pr.commitMessages.join('\n')}`);
  }

  // Diff
  parts.push(`## Diff\n\`\`\`diff\n${opts.diff}\n\`\`\``);

  // Output format instruction (D-07: same 6-section contract for both CLIs)
  parts.push(
    `## Instructions\nProvide a thorough code review structured as exactly 6 sections with these exact H2 headings:\n` +
    `## Executive Summary\n## Categorized Changes\n## Key Code Changes\n## Findings\n## Impact Analysis\n## Mermaid Diagram\n\n` +
    `For the Findings section, prefix each finding with its severity: [critical], [warning], or [suggestion].\n` +
    `For the Mermaid Diagram section, output a valid Mermaid diagram (flowchart or sequence) representing the change flow.\n` +
    `For the Key Code Changes section, show before/after snippets for significant changes.`,
  );

  return parts.join('\n\n---\n\n');
}
