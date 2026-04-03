---
phase: 02-ai-review-generation
plan: 04
subsystem: cli
tags: [child_process, readline, streaming, subprocess, adapter-pattern, vitest]

# Dependency graph
requires:
  - phase: 02-02
    provides: PromptBuilder and SubprocessRunner spawn/readline/cancel patterns

provides:
  - CLIAdapter interface (buildArgs + extractText) in ClaudeAdapter.ts
  - ClaudeAdapter with --print --verbose --output-format stream-json --include-partial-messages flags
  - CodexAdapter with plain-text fallback and JSON detection
  - runReview function with 200ms batch timer and CancellationToken support
  - Vitest unit tests for all adapter behavior (replaces it.todo stubs)

affects:
  - 02-05 (ReviewPanel webview — calls runReview with onChunk)
  - 02-06 (ReviewCommand — wires adapter selection and cliPath)
  - future integration testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CLIAdapter interface pattern (buildArgs + extractText) for per-CLI flag and parsing isolation
    - settle-once flag prevents double-resolve on close + cancellation race
    - 200ms batch timer with final flush in settle() prevents stale chunks (Pitfall 7)

key-files:
  created:
    - src/easy-review/cli/ClaudeAdapter.ts
    - src/easy-review/cli/CodexAdapter.ts
    - src/easy-review/cli/ReviewRunner.ts
  modified:
    - src/test/unit/review-runner.test.ts

key-decisions:
  - "CLIAdapter interface defined in ClaudeAdapter.ts and imported by CodexAdapter to keep the interface co-located with the primary implementor"
  - "CodexAdapter defaults to plain-text stdout with JSON detection fallback — spike pending empirical validation"
  - "200ms batch interval cleared via settle() function that also performs final buffer flush"

patterns-established:
  - "Adapter pattern: each CLI has its own adapter class implementing CLIAdapter; ReviewRunner is CLI-agnostic"
  - "settle-once guard: boolean flag prevents double-resolve/reject when close and cancellation fire simultaneously"
  - "Final flush before clearInterval: settle() flushes remaining buffer before clearing the interval"

requirements-completed: [REV-01, REV-03]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 02 Plan 04: CLI Streaming Layer Summary

**CLIAdapter interface with ClaudeAdapter (stream-json parsing) and CodexAdapter (plain-text fallback), plus ReviewRunner streaming subprocess with 200ms batch timer and settle-once cancellation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T19:23:38Z
- **Completed:** 2026-04-03T19:31:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- CLIAdapter interface and ClaudeAdapter with correct stream-json delta parsing (both flat and nested --verbose formats)
- CodexAdapter with plain-text stdout default and JSON detection fallback (spike-ready)
- ReviewRunner with 200ms setInterval batching, settle-once guard, SIGTERM cancellation, and final buffer flush in finally-equivalent settle()
- All it.todo stubs in review-runner.test.ts replaced with 8 passing vitest tests

## Task Commits

Each task was committed atomically:

1. **Task 1: ClaudeAdapter, CodexAdapter, and CLIAdapter interface** - `61ff4af0` (feat)
2. **Task 2: ReviewRunner — streaming subprocess with 200ms batch timer** - `bd809a01` (feat, TDD GREEN)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/easy-review/cli/ClaudeAdapter.ts` - CLIAdapter interface + ClaudeAdapter with stream-json parsing
- `src/easy-review/cli/CodexAdapter.ts` - CodexAdapter with plain-text fallback and JSON detection
- `src/easy-review/cli/ReviewRunner.ts` - runReview with 200ms batch timer, settle-once, CancellationToken
- `src/test/unit/review-runner.test.ts` - 8 vitest tests replacing it.todo stubs

## Decisions Made

- CLIAdapter interface is exported from ClaudeAdapter.ts (co-located with primary implementor) and imported by CodexAdapter via type import — keeps the interface in one place without a separate file
- CodexAdapter uses plain-text fallback as default because Codex CLI output format is unknown (RESEARCH.md Pitfall 1). JSON detection runs first so it is forward-compatible if Codex outputs JSON
- `settle()` function (not a finally block) acts as the cleanup point: clears the interval, flushes remaining buffer, and calls resolve/reject exactly once — mirrors the SubprocessRunner.ts settle-once pattern from Phase 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ReviewRunner, ClaudeAdapter, and CodexAdapter are ready for Plan 02-05 (ReviewPanel webview)
- Plan 02-06 (ReviewCommand) will wire adapter selection (Claude vs Codex) and resolve cliPath via PathResolver
- CodexAdapter.buildArgs flags should be updated empirically after running `codex --help` — current `--quiet` flag is a reasonable default but unverified

---
*Phase: 02-ai-review-generation*
*Completed: 2026-04-03*
