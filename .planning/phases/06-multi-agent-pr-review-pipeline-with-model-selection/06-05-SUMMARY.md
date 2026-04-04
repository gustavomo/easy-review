---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "05"
subsystem: agents
tags: [multi-agent, orchestration, claude-agent-sdk, adk, mermaid, ollama, codex]

# Dependency graph
requires:
  - phase: 06-multi-agent-pr-review-pipeline-with-model-selection/06-01
    provides: AgentOrchestrator TDD scaffold, agent test contracts
  - phase: 06-multi-agent-pr-review-pipeline-with-model-selection/06-02
    provides: types (AgentKey, SectionState, ModelName), OllamaAdapter, ModelAdapter
  - phase: 06-multi-agent-pr-review-pipeline-with-model-selection/06-03
    provides: per-agent prompt templates (7 agent files), contextRequest.ts
  - phase: 06-multi-agent-pr-review-pipeline-with-model-selection/06-04
    provides: mermaidValidation.ts, modelSettings.ts (resolveAgentModel)
provides:
  - runAllAgents() — 7-agent concurrent dispatch engine in AgentOrchestrator.ts
  - esbuild.extension.js confirmed: ADK not in external array, bundled into CJS
affects:
  - ReviewPanel.ts (will call runAllAgents() to initiate concurrent review)
  - phase 06-06 (integration: wiring ReviewPanel to AgentOrchestrator)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/claude-agent-sdk (installed via npm --legacy-peer-deps)"
  patterns:
    - "ADK query() via require() not import — avoids ERR_REQUIRE_ESM in VS Code CJS extension host"
    - "Promise.allSettled over Promise.all — individual agent failures don't abort pipeline"
    - "Mermaid self-correction loop: up to 2 retries with correction prompt containing previous invalid output"
    - "Shared AbortController wired to VS Code CancellationToken for coordinated cancellation"

key-files:
  created:
    - src/easy-review/agents/AgentOrchestrator.ts
  modified:
    - esbuild.extension.js

key-decisions:
  - "ADK require() pattern: const { query } = require('@anthropic-ai/claude-agent-sdk') as typeof import(...) — preserves TS type safety while avoiding ESM runtime issue"
  - "Promise.allSettled chosen so individual agent failures return { status: error } without aborting the other 6 agents"
  - "Mermaid retry loop runs up to MAX_MERMAID_RETRIES=2 and returns raw output after all retries exhausted (DiagramErrorBanner handles in webview)"

patterns-established:
  - "Pattern: ADK require() for ESM-only packages bundled via esbuild"
  - "Pattern: runSingleAgent() helper function encapsulates per-agent model routing and error handling"
  - "Pattern: correction prompt = original prompt + invalid output + error + instruction to fix"

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-04-04
---

# Phase 06 Plan 05: AgentOrchestrator — 7-Agent Concurrent Dispatch Engine Summary

**7-agent concurrent dispatch engine using Promise.allSettled, ADK query() for Claude, ReviewRunner for Codex, and OllamaAdapter for Ollama, with Mermaid self-correction retry loop (2 retries)**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-04T17:43:00Z
- **Completed:** 2026-04-04T17:58:00Z
- **Tasks:** 2
- **Files modified:** 3 (AgentOrchestrator.ts created, esbuild.extension.js modified, package.json + package-lock.json updated)

## Accomplishments

- AgentOrchestrator.ts implemented with runAllAgents() dispatching 7 agents concurrently via Promise.allSettled
- Claude-path uses ADK query() with permissionMode:'bypassPermissions' and maxTurns:1 — proper single-turn agent invocation
- Codex-path uses existing ReviewRunner.runReview() + CodexAdapter pattern (no new infrastructure needed)
- Ollama-path uses OllamaAdapter.run() with shared AbortController for cancellation
- Diagram agent has full self-correction retry loop: validateMermaidSyntax → correction prompt → retry (up to 2 times)
- parseContextRequest() called before each agent to lazily inject projectAnalysis/commitHistory context
- onSectionUpdate() fires on pending→generating and generating→complete|error transitions
- esbuild.extension.js confirmed: ADK not in external array, bundled into CJS by esbuild
- @anthropic-ai/claude-agent-sdk installed successfully

## Task Commits

1. **Task 1: Verify esbuild config — ADK must NOT be in external array** - `985a84a3` (chore)
2. **Task 2: AgentOrchestrator.ts — 7-agent concurrent dispatch with ADK + Mermaid retry** - `aa177223` (feat)

## Files Created/Modified

- `src/easy-review/agents/AgentOrchestrator.ts` — 7-agent concurrent orchestration engine (created, 373 lines)
- `esbuild.extension.js` — Added clarifying comment about ADK not being externalized
- `package.json` — @anthropic-ai/claude-agent-sdk added as dependency
- `package-lock.json` — Lock file updated

## Decisions Made

- ADK `require()` pattern used (not ES `import`) because `@anthropic-ai/claude-agent-sdk` is ESM-only and esbuild bundles it into CJS at build time. Using `as typeof import(...)` cast preserves full TypeScript type safety.
- `Promise.allSettled` chosen (not `Promise.all`) so that if one agent fails, the remaining 6 continue running and report their own results.
- Mermaid retry loop implemented as a separate `runDiagramWithRetry()` function for clarity. After 2 failed retries, raw output is returned — the webview DiagramErrorBanner handles the display error.
- Context injection uses a two-pass approach: first call `getTemplate(baseOpts)` to get the CONTEXT_REQUEST header, then call again with full context injected to get the final prompt body.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- `npm install @anthropic-ai/claude-agent-sdk` failed without `--legacy-peer-deps` due to peer dependency conflicts (mermaid @opentelemetry/api conflict — already known from Phase 02.3). Resolved by adding `--legacy-peer-deps` flag. This is consistent with existing project pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AgentOrchestrator.ts ready to be called from ReviewPanel.ts (Phase 06 Plan 06)
- ADK query() path verified: compiles without errors, accept criteria all satisfied
- Pre-existing test failures (SQLite ABI mismatch, CodexAdapter) remain from prior phases — not introduced by this plan

---
*Phase: 06-multi-agent-pr-review-pipeline-with-model-selection*
*Completed: 2026-04-04*
