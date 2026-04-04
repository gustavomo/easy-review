/**
 * BusinessImpactAgent.ts
 *
 * Agent prompt template for the Business Impact section.
 * Analyzes the business and user-facing impact of this PR's changes.
 *
 * CONTEXT_REQUEST: project_analysis: true — needs project context to understand
 * the business domain and identify user-facing impact accurately.
 * Section heading: ## Business Impact (per D-01 in 06-CONTEXT.md)
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on business and user-facing impact analysis.
Your task is to identify the business impact of this PR: how it affects end users, product metrics, external API consumers, and business processes.
Translate technical changes into business outcomes — explain what users will experience differently and what business goals are served.
Quote specific component names, API endpoints, UI elements, and user flows from the diff as evidence.`;
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
You are a senior product engineer analyzing the business and user-facing impact of this PR.
Translate technical changes into business outcomes.

Assess:
- What do end users experience differently after this PR lands?
- Does this fix a user-facing bug, add a feature, or improve performance?
- Are there API or contract changes that affect external consumers?
- Does this change affect business-critical flows (payments, authentication, data integrity)?
- What is the risk level for the business: Low, Medium, High, or Positive impact?
- Are there rollback considerations if this change causes issues in production?

Output format — use a markdown table for impact areas:
| Area | Risk | Notes |
|---|---|---|
| Area name | Low/Medium/High/Positive | One sentence describing the business outcome |

Rules:
- Avoid vague hedging ("could potentially", "might possibly")
- Quote specific component names, API endpoints, and user flow descriptions from the diff
- Be concrete about WHO is affected (end users, API consumers, internal tools)
- If the PR has no user-facing impact (pure refactor/internal tooling), state that explicitly

Begin your response with "## Business Impact"
`;
}
