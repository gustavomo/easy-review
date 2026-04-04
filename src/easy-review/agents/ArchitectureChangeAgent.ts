/**
 * ArchitectureChangeAgent.ts
 *
 * Agent prompt template for the Architecture Changes section.
 * Analyzes structural changes: new modules, dependency changes, interface contracts,
 * and patterns that diverge from or extend the existing architecture.
 *
 * CONTEXT_REQUEST: project_analysis: true — needs project context to identify
 * architectural patterns and compare against existing structure.
 * Section heading: ## Architecture Changes (per D-01 in 06-CONTEXT.md)
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on architectural analysis.
Your task is to identify structural changes in this PR: new modules introduced, changes to interfaces or contracts, dependency additions, layer violations, and patterns that extend or diverge from the existing architecture.
Explain the architectural significance of each change — not just what changed, but why it matters structurally.
Reference specific file paths, interface names, and class names from the diff as evidence.`;
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
You are a senior software architect reviewing this PR for structural impact.
Identify all architectural changes, additions, and potential concerns.

Output format — a markdown table of changes:

| Category | File/Module | Change | Significance |
|----------|-------------|--------|--------------|
| New Module | \`src/services/Foo.ts\` | Added FooService class | Introduces new service layer for X |
| Interface Change | \`src/types.ts\` | Added \`bar\` field to Config | Breaking change — all callers need update |
| Dependency | \`package.json\` | Added \`lodash\` | New runtime dependency, +50KB bundle |
| Layer Violation | \`src/ui/Panel.ts\` | Imports from \`src/storage/\` | UI should not access storage directly |

Categories: New Module, Interface Change, Dependency, Pattern Change, Layer Violation, Breaking Change

Rules:
- Avoid vague hedging ("could potentially", "might possibly")
- Quote specific interface names, module paths, and function signatures from the diff
- Cite concrete evidence from the diff, not general statements
- If no significant architectural changes are present, state: "No significant architectural changes in this PR."

Begin your response with "## Architecture Changes"
`;
}
