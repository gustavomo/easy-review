---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "03"
subsystem: agents
tags: [mermaid, prompt-templates, context-request, validation, pure-functions]

# Dependency graph
requires:
  - phase: 06-01
    provides: TDD test scaffolds for contextRequest and mermaidValidation
provides:
  - parseContextRequest() pure function for ## CONTEXT_REQUEST header parsing
  - validateMermaidSyntax() + extractMermaidBlock() pure Mermaid validation functions
  - MERMAID_DIAGRAM_TYPES list of 16 recognized diagram type keywords
  - AgentTemplateOpts interface for agent template functions
  - 7 per-agent prompt template files (getSystemPrompt + getTemplate exports)
affects:
  - 06-05-AgentOrchestrator — uses parseContextRequest before dispatching agents
  - 06-05-AgentOrchestrator — uses validateMermaidSyntax after DiagramAgent completes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CONTEXT_REQUEST header block in agent prompt templates for lazy context loading"
    - "Regex-based Mermaid diagram type validation in extension host (Node.js)"
    - "Pure function agent utilities with no external dependencies (testable in vitest)"
    - "getSystemPrompt() + getTemplate(opts) export pattern for agent template files"

key-files:
  created:
    - src/easy-review/agents/contextRequest.ts
    - src/easy-review/agents/mermaidValidation.ts
    - src/easy-review/agents/agentTypes.ts
    - src/easy-review/agents/PRSummarizerAgent.ts
    - src/easy-review/agents/BugRiskAgent.ts
    - src/easy-review/agents/ArchitectureChangeAgent.ts
    - src/easy-review/agents/TestCoverageAgent.ts
    - src/easy-review/agents/DocumentationAgent.ts
    - src/easy-review/agents/DiagramAgent.ts
    - src/easy-review/agents/BusinessImpactAgent.ts
    - src/easy-review/agents/contextRequest.test.ts
    - src/easy-review/agents/mermaidValidation.test.ts
  modified: []

key-decisions:
  - "Regex-based Mermaid validation in extension host — mermaid npm package is browser-only; lightweight type keyword check sufficient for self-correction loop (D-16)"
  - "Test files created in same TDD pass as implementation — 06-01 parallel agent had not yet committed test files when 06-03 executed"
  - "Only BugRiskAgent, ArchitectureChangeAgent, BusinessImpactAgent request project_analysis: true — per D-15 in 06-CONTEXT.md"

patterns-established:
  - "Pattern: Agent prompt templates export getSystemPrompt() and getTemplate(opts: AgentTemplateOpts)"
  - "Pattern: CONTEXT_REQUEST header parsed by orchestrator before dispatch, then stripped from body"
  - "Pattern: Pure utility functions with no vscode/Node imports for testability in vitest node environment"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 06 Plan 03: Utility Modules and Per-Agent Prompt Templates Summary

**parseContextRequest + validateMermaidSyntax pure utilities plus 7 per-agent prompt template files with getSystemPrompt/getTemplate exports and correct CONTEXT_REQUEST headers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T17:34:16Z
- **Completed:** 2026-04-04T17:38:22Z
- **Tasks:** 2 completed
- **Files modified:** 12 created (2 utility modules + 2 test files + 1 types file + 7 agent templates)

## Accomplishments
- Implemented `parseContextRequest()` to parse `## CONTEXT_REQUEST` header blocks from agent prompt templates using the exact regex from RESEARCH.md Pattern 3
- Implemented `validateMermaidSyntax()` and `extractMermaidBlock()` pure utility functions for extension-host Mermaid validation (browser-free, Node.js compatible)
- Created `agentTypes.ts` with `AgentTemplateOpts` interface and 7 agent template files each exporting `getSystemPrompt()` + `getTemplate(opts)`
- All contextRequest.test.ts and mermaidValidation.test.ts tests pass GREEN with no .todo skips

## Task Commits

Each task was committed atomically:

1. **Task 1: contextRequest.ts + mermaidValidation.ts utility modules (TDD GREEN)** - `8c066e13` (feat)
2. **Task 2: 7 per-agent prompt template files** - `e843f4c9` (feat)

_Note: TDD RED phase: test files were written first, confirmed module-not-found failures, then implementation made them GREEN._

## Files Created/Modified
- `src/easy-review/agents/contextRequest.ts` — parseContextRequest() pure function with CONTEXT_REQUEST regex
- `src/easy-review/agents/mermaidValidation.ts` — validateMermaidSyntax(), extractMermaidBlock(), MERMAID_DIAGRAM_TYPES
- `src/easy-review/agents/agentTypes.ts` — AgentTemplateOpts interface shared by all 7 agent files
- `src/easy-review/agents/PRSummarizerAgent.ts` — no CONTEXT_REQUEST, outputs ## PR Summary
- `src/easy-review/agents/BugRiskAgent.ts` — project_analysis: true, [critical]/[warning]/[suggestion] format
- `src/easy-review/agents/ArchitectureChangeAgent.ts` — project_analysis: true, outputs ## Architecture Changes
- `src/easy-review/agents/TestCoverageAgent.ts` — no CONTEXT_REQUEST, outputs ## Test Coverage
- `src/easy-review/agents/DocumentationAgent.ts` — no CONTEXT_REQUEST, outputs ## Documentation Review
- `src/easy-review/agents/DiagramAgent.ts` — no CONTEXT_REQUEST, Mermaid output with type keyword requirements
- `src/easy-review/agents/BusinessImpactAgent.ts` — project_analysis: true, outputs ## Business Impact
- `src/easy-review/agents/contextRequest.test.ts` — 5 test cases, all passing
- `src/easy-review/agents/mermaidValidation.test.ts` — 12 test cases, all passing

## Decisions Made

- **Regex-based Mermaid validation:** The `mermaid` npm package is browser-only (requires DOM). Extension host validation uses a lightweight check that the diagram source starts with a recognized type keyword from `MERMAID_DIAGRAM_TYPES`. This is sufficient for the self-correction retry loop per D-16 in 06-CONTEXT.md.
- **Test files created in this plan:** The 06-01 parallel agent had not yet committed `contextRequest.test.ts` and `mermaidValidation.test.ts` when this agent started. TDD was followed correctly: tests written first (RED), then implementation (GREEN).
- **CONTEXT_REQUEST headers match D-15 exactly:** Only BugRiskAgent, ArchitectureChangeAgent, and BusinessImpactAgent declare `project_analysis: true`. PRSummarizerAgent, TestCoverageAgent, DocumentationAgent, and DiagramAgent omit the CONTEXT_REQUEST block entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created test files that 06-01 had not yet committed**
- **Found during:** Task 1 (contextRequest.ts + mermaidValidation.ts)
- **Issue:** Plan 06-03 depends on 06-01, which creates the test files. Since 06-01 was running in parallel and hadn't committed yet, the test files were absent.
- **Fix:** Created `contextRequest.test.ts` and `mermaidValidation.test.ts` as part of the TDD RED phase, then implemented the modules to make them GREEN. The tests follow the exact contracts specified in 06-01-PLAN.md.
- **Files modified:** `src/easy-review/agents/contextRequest.test.ts`, `src/easy-review/agents/mermaidValidation.test.ts`
- **Committed in:** `8c066e13` (part of task commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking issue)
**Impact on plan:** Test files created that will merge cleanly with 06-01's output — same contracts, same function signatures. No scope creep.

## Issues Encountered
None beyond the parallel execution dependency noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `parseContextRequest()` and `validateMermaidSyntax()` are ready for import by AgentOrchestrator (Plan 06-05)
- All 7 agent template files export `getSystemPrompt()` and `getTemplate(opts)` with correct CONTEXT_REQUEST headers
- DiagramAgent specifically enforces Mermaid type keyword requirements needed for the self-correction loop
- BugRiskAgent includes [critical]/[warning]/[suggestion] format guidance for findings parsing

## Self-Check: PASSED

All files verified present on disk. Both commits (8c066e13, e843f4c9) confirmed in git log. All acceptance criteria satisfied.

---
*Phase: 06-multi-agent-pr-review-pipeline-with-model-selection*
*Completed: 2026-04-04*
