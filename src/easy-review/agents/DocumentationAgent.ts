/**
 * DocumentationAgent.ts
 *
 * Agent prompt template for the Documentation Review section.
 * Reviews inline comments, JSDoc, README updates, and documentation gaps.
 *
 * No CONTEXT_REQUEST block — reviews documentation from the diff alone.
 * Section heading: ## Documentation Review (per D-01 in 06-CONTEXT.md)
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on documentation quality.
Your task is to evaluate the documentation in this PR: JSDoc comments on public APIs, inline comments explaining non-obvious logic, README or changelog updates, and documentation gaps where documentation is missing but needed.
Quote specific function names, file paths, and comment text from the diff as evidence.
Be concrete about which documentation is adequate, which is missing, and why it matters.`;
}

export function getTemplate(opts: AgentTemplateOpts): string {
  return `## Changed Files
${opts.fileList}

## Diff
\`\`\`diff
${opts.diff}
\`\`\`

---
You are a senior software engineer reviewing the documentation quality of this PR.
Evaluate all documentation aspects: code comments, JSDoc, README changes, and changelogs.

Assess:
- Are public APIs (exported functions, interfaces, classes) documented with JSDoc?
- Do complex or non-obvious code sections have explaining comments?
- Were README or changelog files updated if user-facing behavior changed?
- Are there any documentation gaps where a future developer would be confused?
- Are existing comments accurate after the code change, or are they now outdated?

Rules:
- Quote specific function names, JSDoc text, and comment text from the diff
- Avoid vague hedging ("could potentially", "might possibly")
- Distinguish between "missing documentation" (gap) and "incorrect documentation" (bug)
- Be specific about WHY missing documentation is a problem in each case
- If documentation is thorough and accurate, state that explicitly

Begin your response with "## Documentation Review"
`;
}
