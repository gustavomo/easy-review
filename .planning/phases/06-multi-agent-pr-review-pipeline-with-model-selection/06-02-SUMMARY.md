---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "02"
subsystem: api
tags: [typescript, types, ollama, model-adapter, multi-agent]

# Dependency graph
requires:
  - phase: 06-01
    provides: Wave 1 foundation context for type contracts
provides:
  - AgentKey union type with 7 agent keys
  - SectionStatus and SectionState types for progressive rendering
  - ModelName type for per-agent model selection
  - sectionUpdate ExtensionMessage variant for host→webview updates
  - ModelAdapter interface wrapping CLI and HTTP execution paths
  - OllamaAdapter implementing ModelAdapter via POST to localhost:11434
affects:
  - 06-03
  - 06-04
  - 06-05
  - 06-06
  - 06-07
  - 06-08

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ModelAdapter interface: uniform run(opts) interface across CLI subprocess and Ollama HTTP paths"
    - "OllamaAdapter: fetch with ReadableStream reader + TextDecoder for ndjson streaming"
    - "SectionState: pending|generating|complete|error per-agent status map"

key-files:
  created:
    - src/easy-review/cli/ModelAdapter.ts
    - src/easy-review/cli/OllamaAdapter.ts
  modified:
    - src/shared/types.ts

key-decisions:
  - "agentSections made optional in WebviewState generating variant — ReviewPanel.ts constructs generating state without agentSections; optional avoids breaking existing usage"
  - "Phase 6 types appended after existing WebviewState — TypeScript resolves forward references within a file; ordering does not matter for type aliases"
  - "OllamaAdapter uses Node built-in fetch per CLAUDE.md constraint (no node-fetch, no axios)"

patterns-established:
  - "ModelAdapter.run(opts): single entry point for all model invocations; orchestrator calls run() regardless of claude/codex/ollama"
  - "OllamaAdapter ndjson streaming: leftover buffer handles line boundaries across chunk reads"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 06 Plan 02: Shared Type Contracts + OllamaAdapter Summary

**AgentKey/SectionState types as Phase 6 backbone + OllamaAdapter implementing fetch-based ndjson streaming to localhost:11434**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T17:33:00Z
- **Completed:** 2026-04-04T17:34:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended `src/shared/types.ts` with AgentKey (7 values per D-20), SectionStatus, SectionState, ModelName, and sectionUpdate message variant
- Created `ModelAdapter` interface with `ModelRunOpts` type providing uniform execution interface for all model paths (D-12)
- Created `OllamaAdapter` implementing `ModelAdapter` with POST to `http://localhost:11434/api/generate`, ndjson streaming via ReadableStream + TextDecoder, leftover-buffer line handling, and AbortSignal propagation

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend src/shared/types.ts with Phase 6 type contracts** - `99d0a00d` (feat)
2. **Task 2: ModelAdapter interface + OllamaAdapter implementation** - `17377610` (feat)

## Files Created/Modified
- `src/shared/types.ts` - Added AgentKey, SectionStatus, SectionState, ModelName, sectionUpdate, updated WebviewState generating variant with optional agentSections
- `src/easy-review/cli/ModelAdapter.ts` - ModelAdapter interface and ModelRunOpts type (D-12)
- `src/easy-review/cli/OllamaAdapter.ts` - OllamaAdapter implementing ModelAdapter with Ollama HTTP streaming

## Decisions Made
- `agentSections` made optional (`?`) in WebviewState `generating` variant: ReviewPanel.ts constructs this state without agentSections at line 165; making it required would break existing code
- Types appended after existing WebviewState — TypeScript resolves type aliases regardless of declaration order within a file, so `sectionUpdate` can reference `AgentKey` and `SectionState` declared after `ExtensionMessage`
- Node built-in `fetch` used in OllamaAdapter per CLAUDE.md constraint (no axios, no node-fetch)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — TypeScript compilation confirmed clean for new files. Pre-existing errors in ReviewPanel.ts (missing prNumber), webview JSX files, folderRepositoryManager.ts, and EasyReviewTreeNodes.ts are unrelated to this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AgentKey, SectionState, ModelAdapter, OllamaAdapter are available as the type backbone for all other Phase 6 plans
- Plans 06-03 through 06-08 can import AgentKey and SectionState from src/shared/types.ts
- Plans implementing Claude/Codex agents can import ModelAdapter from src/easy-review/cli/ModelAdapter.ts
- OllamaAdapter ready for use in Plan 06-05 agent dispatch

---
*Phase: 06-multi-agent-pr-review-pipeline-with-model-selection*
*Completed: 2026-04-04*
