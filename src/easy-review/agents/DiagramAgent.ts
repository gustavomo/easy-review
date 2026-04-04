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

The diagram MUST show the BEFORE and AFTER state so the reviewer can see what changed at a glance.

LAYOUT RULE: Use \`flowchart TD\` (top-down). Place "Before" subgraph on top and "After" subgraph below it so they stack vertically. This keeps the diagram readable at any width. NEVER use \`flowchart LR\` with Before/After subgraphs — they get cramped side by side.

If the PR has MULTIPLE independent changes (e.g. 3 different files/features changed), produce SEPARATE Before/After pairs stacked vertically — one pair per logical change. Do NOT cram everything into one giant subgraph.

Example for a single change:
\`\`\`mermaid
flowchart TD
    subgraph Before
        A[ReviewPanel] --> B[runReview]
        B --> C[SingleAgent]
    end
    subgraph After
        D[ReviewPanel] --> E[AgentOrchestrator]
        E --> F[PRSummarizerAgent]
        E --> G[BugRiskAgent]
        E --> H[DiagramAgent]
    end
\`\`\`

Example for multiple independent changes:
\`\`\`mermaid
flowchart TD
    subgraph Before: Settings
        A1[defaultModel string]
    end
    subgraph After: Settings
        A2[provider enum] --> A3[claudeModel]
        A2 --> A4[ollamaModel]
    end
    subgraph Before: Rendering
        B1[SingleSection] --> B2[StreamingView]
    end
    subgraph After: Rendering
        B3[7-SlotLayout] --> B4[AgentStatusBar]
        B3 --> B5[SectionPendingPlaceholder]
    end
\`\`\`

CRITICAL REQUIREMENTS:
1. Produce a syntactically valid Mermaid diagram.
2. Always use \`flowchart TD\` for Before/After diagrams — top-down stacking.
3. Wrap the diagram in triple-backtick mermaid fences.
4. Label ALL nodes with real names from the code (function names, class names, module paths) — not generic placeholders.
5. Make the diagram specific to this PR — not generic.
6. OUTPUT ONLY the heading and the code block — no explanatory text, no commentary before or after the fences. The closing \`\`\` must be the very last character of your response.

Skip diagram only for single-line typo fixes or pure config changes with no logic impact.
In that case, write: "No diagram needed — this PR contains only trivial changes."

Begin your response with "## Visual Overview", then immediately the \`\`\`mermaid block, then the closing \`\`\` and nothing else.
`;
}
