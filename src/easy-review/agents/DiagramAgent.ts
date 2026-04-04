/**
 * DiagramAgent.ts
 *
 * Agent prompt template for the Visual Overview section.
 * Produces a Mermaid diagram to visually represent the key changes in this PR.
 *
 * No CONTEXT_REQUEST block — generates diagram from the diff alone.
 * Section heading: ## Visual Overview (per D-01 in 06-CONTEXT.md)
 *
 * Special requirements (D-16 in 06-CONTEXT.md):
 * - Output MUST be wrapped in ```mermaid fences
 * - Diagram MUST start with a recognized Mermaid type keyword
 * - The orchestrator validates and retries up to 2 times on validation failure
 */

import type { AgentTemplateOpts } from './agentTypes';

export function getSystemPrompt(): string {
  return `You are a specialized code reviewer focused on producing visual diagrams of PR changes.
Your task is to produce a syntactically valid Mermaid diagram that makes the key changes in this PR visually understandable.
Start the diagram with a recognized Mermaid type keyword: graph, flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, gitGraph, mindmap, timeline, xychart-beta, block-beta, or quadrantChart.
The diagram must be specific to this PR — label nodes with real names from the code (function names, class names, module paths, state names).`;
}

export function getTemplate(opts: AgentTemplateOpts): string {
  return `## Changed Files
${opts.fileList}

## Diff
\`\`\`diff
${opts.diff}
\`\`\`

---
You are a senior software engineer producing a visual diagram for this PR.
Use a Mermaid diagram to make the changes visually understandable.

Choose the most appropriate diagram type for this PR:
- **sequenceDiagram**: show how execution flow changed (new steps, new branches, new interactions)
- **graph TD / flowchart**: show which modules or components now interact differently
- **stateDiagram-v2**: show new states or transitions introduced by this PR
- **classDiagram**: show new classes, interfaces, or changed relationships

CRITICAL REQUIREMENTS:
1. Produce a syntactically valid Mermaid diagram.
2. Start the diagram with a recognized type keyword: graph, flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, journey, gantt, pie, gitGraph, mindmap, timeline, xychart-beta, block-beta, or quadrantChart.
3. Wrap the diagram in triple-backtick mermaid fences exactly like this:
   \`\`\`mermaid
   sequenceDiagram
       participant A as ModuleName
       A->>B: call()
   \`\`\`
4. Label ALL nodes with real names from the code (function names, class names, module paths) — not generic placeholders like "Module A".
5. Make the diagram ELABORATE and specific to this PR — not generic.
6. OUTPUT ONLY the heading and the code block — no explanatory text, no "Key Changes" section, no commentary before or after the fences. The closing \`\`\` must be the very last character of your response.

Skip diagram only for single-line typo fixes or pure config changes with no logic impact.
In that case, write: "No diagram needed — this PR contains only trivial changes."

Begin your response with "## Visual Overview", then immediately the \`\`\`mermaid block, then the closing \`\`\` and nothing else.
`;
}
