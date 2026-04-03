---
phase: 01-foundation
plan: 06
subsystem: cli
tags: [child_process, spawn, streaming, path-resolution, vscode-output-channel, cancellation, timeout]

# Dependency graph
requires:
  - phase: 01-04
    provides: activation.ts entry point and context registration patterns
  - phase: 01-05
    provides: parsePRUrl, PRPersistenceService, addPRByUrl command stub in activation.ts

provides:
  - PathResolver: settings -> shell spawn -> common paths detection chain (D-15)
  - SubprocessRunner: streaming child_process.spawn with SIGTERM cancellation and 5-min hard timeout (D-14)
  - OutputChannelReporter: shared VS Code Output Channel singleton for CLI streaming (D-13)
  - Activation health check: resolves claude path on startup, stores in globalState
  - CFG-02: first-activation warning notification with Configure Path action button
  - easy-review.testCLI command: end-to-end subprocess streaming validation command

affects: [phase-02-review-generation, phase-03-mcp, phase-04-packaging]

# Tech tracking
tech-stack:
  added: [child_process (Node built-in), readline (Node built-in)]
  patterns:
    - CommonJS-safe PATH detection via execSync interactive shell (no ESM fix-path/shell-env)
    - Promise-based subprocess wrapper with settle-once pattern for cancellation + timeout
    - Singleton Output Channel via module-level _channel with dispose-on-deactivate

key-files:
  created:
    - src/easy-review/cli/PathResolver.ts
    - src/easy-review/cli/SubprocessRunner.ts
    - src/easy-review/cli/OutputChannelReporter.ts
  modified:
    - src/easy-review/activation.ts
    - src/extension.ts
    - src/test/unit/path-resolver.test.ts
    - src/test/unit/subprocess.test.ts
    - package.json

key-decisions:
  - "activateEasyReview made async (Promise<void>) so health check awaits can work; extension.ts awaits it"
  - "vi.spyOn used instead of vi.mocked for vscode workspace mock — vitest alias resolves to plain-function mock, not vi.fn()"
  - "SubprocessRunner uses settle-once flag to prevent double-resolve when both close event and cancellation fire"

patterns-established:
  - "PathResolver pattern: settings trim+existsSync guard -> execSync interactive shell (5s timeout) -> COMMON_PATHS loop"
  - "SubprocessRunner pattern: spawn stdio:pipe -> readline line buffering -> settle() wrapper prevents double-resolve"
  - "OutputChannel pattern: module-level singleton, getOutputChannel() lazy-creates, disposeOutputChannel() in deactivate"

requirements-completed: [CFG-01, CFG-02]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 01 Plan 06: CLI Integration Summary

**PathResolver (settings->shell->common-paths), streaming SubprocessRunner with 5-min timeout+cancellation, and CFG-02 first-activation setup notification wired into activation.ts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T18:29:00Z
- **Completed:** 2026-04-03T18:32:16Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- PathResolver implements D-15 detection chain: configured setting -> interactive shell `which claude` -> common install locations. No ESM dependencies (D-17 compliance).
- SubprocessRunner spawns claude with `--print --output-format stream-json --include-partial-messages`, streams stdout via readline, kills with SIGTERM on cancellation or 5-minute hard timeout (D-14).
- OutputChannelReporter provides a lazy singleton Output Channel; `disposeOutputChannel()` called in deactivate (D-13).
- Activation health check (CFG-01 + CFG-02): resolves claude path, stores in globalState. On first run with no claude found, shows warning with "Configure Path" button that opens `easyReview.claudePath` setting.
- `easy-review.testCLI` command registered in both activation.ts and package.json contributes.commands.
- All 26 unit tests pass (5 test files green, 13 todos preserved for integration phase).

## Task Commits

1. **Task 1: PathResolver, SubprocessRunner, OutputChannelReporter** - `ba873ec9` (feat)
2. **Task 2: Activation health checks and testCLI command** - `77511a4b` (feat)

## Files Created/Modified

- `src/easy-review/cli/PathResolver.ts` - resolveClaudePath() with settings->shell->common-paths chain
- `src/easy-review/cli/SubprocessRunner.ts` - runClaudeStreaming() with cancellation + 5-min timeout
- `src/easy-review/cli/OutputChannelReporter.ts` - singleton Output Channel with lazy-init and dispose
- `src/easy-review/activation.ts` - made async; added health check, first-run notification, testCLI command
- `src/extension.ts` - awaits activateEasyReview()
- `src/test/unit/path-resolver.test.ts` - 6 real assertions using vi.spyOn on vscode workspace alias
- `src/test/unit/subprocess.test.ts` - 2 export-shape assertions + 7 todos for integration phase
- `package.json` - easy-review.testCLI added to contributes.commands

## Decisions Made

- Made `activateEasyReview` async so the claude path health check can `await globalState.update()` and `showWarningMessage()` without fire-and-forget semantics. `extension.ts` already has an async `activate()` function so this was a clean change.
- Used `vi.spyOn` instead of `vi.mocked().mockReturnValue` for the vscode workspace mock — the vitest.config.ts alias resolves `vscode` to a plain-function mock (not `vi.fn()`), so `vi.mocked()` wrapping doesn't add spy capabilities. `vi.spyOn` on the object works correctly.
- SubprocessRunner uses a `settle` wrapper + `settled` boolean flag to prevent double-resolve/reject when both `close` event and cancellation/timeout fire near-simultaneously.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] activateEasyReview made async — was void, couldn't use await**
- **Found during:** Task 2 (activation health checks)
- **Issue:** Plan's health check code used `await` inside a synchronous `void` function, causing TS2308 errors
- **Fix:** Changed signature to `async function activateEasyReview(...): Promise<void>` and updated `extension.ts` to `await activateEasyReview(context)`
- **Files modified:** src/easy-review/activation.ts, src/extension.ts
- **Verification:** `npm run build:extension` exits 0, no TS errors
- **Committed in:** `77511a4b` (Task 2 commit)

**2. [Rule 1 - Bug] Test mocking: vi.spyOn instead of vi.mocked().mockReturnValue**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** vitest.config.ts aliases `vscode` to a plain-function mock object, not `vi.fn()` spies. `vi.mocked(workspace.getConfiguration).mockReturnValue(...)` threw "not a function"
- **Fix:** Replaced with `vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue(...)` pattern throughout path-resolver tests
- **Files modified:** src/test/unit/path-resolver.test.ts
- **Verification:** All 26 unit tests pass
- **Committed in:** `ba873ec9` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope added or removed.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- Phase 2 (review generation) can import `runClaudeStreaming` from `SubprocessRunner.ts` directly — the streaming infrastructure is production-quality.
- `getOutputChannel()` is available for any new command that needs CLI output streaming.
- The `testCLI` command can be used manually in VS Code to validate the full chain end-to-end before Phase 2 builds on it.
- Blocker: `easy-review.addPRByUrl` still has a TODO for Octokit integration (deferred from Plan 01-05) — not a Phase 2 blocker since review generation doesn't depend on Octokit.

---
*Phase: 01-foundation*
*Completed: 2026-04-03*
