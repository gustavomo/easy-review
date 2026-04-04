/**
 * BugRiskAgent.ts
 *
 * Agent prompt template for the Bug & Risk Analysis section.
 * Identifies bugs, regressions, edge cases, and security risks in the PR diff.
 *
 * CONTEXT_REQUEST: project_analysis: true — needs project context to identify
 * patterns inconsistent with the codebase architecture.
 * Section heading: ## Bug & Risk Analysis (per D-01 in 06-CONTEXT.md)
 *
 * Finding format (per plan spec): [critical], [warning], [suggestion] markers
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on bug detection and risk analysis.
Your task is to identify bugs, regressions, null pointer errors, edge cases, missing error handling, security vulnerabilities, and race conditions introduced by this PR.
Format each finding on its own line starting with [critical], [warning], or [suggestion] based on severity.
Only flag real issues — do not invent problems. Quote specific file paths, function names, and line patterns from the diff as evidence.`;
}

export function getTemplate(opts: AgentTemplateOpts): string {
  const contextBlock = opts.projectAnalysis
    ? `\n\n## Project Context\n${opts.projectAnalysis}`
    : '';

  return `## CONTEXT_REQUEST
project_analysis: true
commit_history: false
---

## Changed Files
${opts.fileList}

## Diff
\`\`\`diff
${opts.diff}
\`\`\`${contextBlock}

---
You are a senior software engineer performing a security and correctness review.
Identify all bugs, regressions, and risks introduced by this PR.

Finding format — each finding on its own line:
[critical] \`file.ts:line\` — description of the critical bug or security issue
[warning] \`file.ts:line\` — description of the warning-level risk
[suggestion] \`file.ts\` — description of the improvement suggestion

Rules:
- Avoid vague hedging ("could potentially", "might possibly") — make definitive statements
- Quote specific function names, file paths, and line patterns from the diff as evidence
- [critical]: bugs that will cause failures, data corruption, security vulnerabilities, or broken invariants
- [warning]: edge cases, missing error handling, potential null dereferences, type mismatches
- [suggestion]: improvements to correctness, readability, or defensive coding
- If no issues found, write: "No bugs or risks identified in this PR."

Begin your response with "## Bug & Risk Analysis"
`;
}
