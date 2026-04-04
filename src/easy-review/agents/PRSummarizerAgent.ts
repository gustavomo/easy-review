/**
 * PRSummarizerAgent.ts
 *
 * Agent prompt template for the PR Summary section.
 * Provides a high-level overview of what the PR achieves and why.
 *
 * No CONTEXT_REQUEST block — this agent works from the diff and file list alone.
 * Section heading: ## PR Summary (per D-01 in 06-CONTEXT.md)
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on producing concise, insight-rich PR summaries.
Your task is to explain WHAT this PR achieves and WHY the changes matter — not just list what files changed.
Write 3–5 sentences that answer: what problem is solved or feature added, what approach was taken, and what the tangible outcome is for users, developers, or the system.
Never restate the diff; infer intent and outcome from file names, component names, and diff content.`;
}

export function getTemplate(opts: AgentTemplateOpts): string {
  return `## Changed Files
${opts.fileList}

## Diff
\`\`\`diff
${opts.diff}
\`\`\`

---
You are a senior software engineer writing a structured PR summary.
Your goal is to help a developer quickly understand WHAT this PR achieves and WHY the changes matter.

Begin your response with "## PR Summary"

**Section 1: Summary (3-5 sentences)**
Answer: What problem is solved or feature added? What approach was taken? What is the tangible outcome?

**Section 2: Key Code Changes (markdown table)**
After the summary paragraph, add:

### Key Code Changes

| File | Change | Purpose |
|------|--------|---------|
| \`src/path/file.ts\` | Added \`functionName()\` | Handles X when Y occurs |
| \`src/path/other.ts\` | Removed \`OldComponent\` | Superseded by NewComponent |

List the most important 5-10 file changes. Group trivial changes (renames, imports) into a single row.

Rules:
- Infer context from file names, component names, and diff content
- Avoid vague hedging language ("could potentially", "might possibly")
- Quote specific function names and file paths from the diff
- Cite concrete evidence — never make general statements without diff-based support

BAD: "This PR removes BulkDisburseBankAccountWarning import and JSX."
GOOD: "Removes the bank account warning banner from the loans disbursement flow. The warning was shown before bulk disbursal to flag accounts without a registered bank account. This component has been superseded by the new inline validation in the DisbursementsList, making the pre-flight warning redundant and reducing visual noise in the confirmation modal."
`;
}
