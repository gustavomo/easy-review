---
phase: 02-ai-review-generation
plan: "02"
subsystem: database
tags: [sqlite, better-sqlite3, typescript, storage, message-protocol, webview]

# Dependency graph
requires:
  - phase: 02-01
    provides: Wave 0 stub tests and test infrastructure for Phase 2 plans
  - phase: 01-foundation
    provides: SQLiteStore, StorageAdapter, StoredPR, PR_TABLE_DDL — extended in this plan

provides:
  - REVIEWS_TABLE_DDL and PROJECT_ANALYSES_TABLE_DDL STRICT table DDL in schema.ts
  - StoredReview and StoredProjectAnalysis interfaces in types.ts
  - Extended StorageAdapter interface with saveReview, getReviews, saveProjectAnalysis, getProjectAnalysis
  - SQLiteStore implementations of all four new methods with snake_case SQL mapping
  - Full message protocol types in src/shared/types.ts (ExtensionMessage, WebviewMessage, ParsedReview, ReviewSection, Finding, WebviewState)

affects: [02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, webview, review-runner, review-parser]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single-row policy via DELETE + INSERT in saveProjectAnalysis (D-35)
    - snake_case SQL columns mapped to camelCase TypeScript via AS aliases in SELECT
    - Discriminated union types for message protocol (type field as literal string discriminant)
    - Shared types file is browser-compatible (no vscode or Node.js imports) — importable by both extension host and webview

key-files:
  created: []
  modified:
    - src/easy-review/storage/schema.ts
    - src/easy-review/storage/types.ts
    - src/easy-review/storage/StorageAdapter.ts
    - src/easy-review/storage/SQLiteStore.ts
    - src/shared/types.ts
    - src/test/unit/sqlite.test.ts

key-decisions:
  - "Single-row policy (D-35) for project_analyses: DELETE + INSERT instead of UPSERT — ensures only one analysis row exists at any time"
  - "snake_case SQL columns mapped to camelCase TypeScript via AS aliases in SELECT — consistent with Phase 1 PR mapping pattern"
  - "Shared types file (src/shared/types.ts) kept browser-compatible — no vscode/Node imports so Vite webview build can import it via @shared alias"

patterns-established:
  - "Pattern: SQL column aliasing — use `col_name AS camelName` in SELECT queries rather than rowToStoredX mapper for new tables"
  - "Pattern: Discriminated union message protocol — all messages identified by `type` literal string for exhaustive switch in handlers"

requirements-completed: [REV-04, REV-05, VIEW-03, PROJ-03]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 02 Plan 02: Storage Layer Extension and Shared Types Summary

**SQLite reviews/project_analyses STRICT tables with full CRUD, plus discriminated-union webview message protocol in shared/types.ts**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T21:17:58Z
- **Completed:** 2026-04-03T21:21:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended SQLiteStore with four new methods: saveReview (returns inserted id), getReviews (DESC by created_at), saveProjectAnalysis (single-row DELETE+INSERT policy), getProjectAnalysis (returns null when empty)
- Added REVIEWS_TABLE_DDL and PROJECT_ANALYSES_TABLE_DDL STRICT table DDL — both executed in initialize()
- Populated src/shared/types.ts with complete webview message protocol: ExtensionMessage, WebviewMessage, ParsedReview, ReviewSection, Finding, WebviewState

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for reviews and project_analyses** - `b389389f` (test)
2. **Task 1 GREEN: Extend storage layer implementation** - `a9c8036f` (feat)
3. **Task 2: Populate shared/types.ts with message protocol** - `6b38e107` (feat)

**Plan metadata:** (docs commit — see below)

_Note: Task 1 used TDD — RED commit (failing tests) followed by GREEN commit (implementation)._

## Files Created/Modified

- `src/easy-review/storage/schema.ts` - Added REVIEWS_TABLE_DDL and PROJECT_ANALYSES_TABLE_DDL STRICT table DDL
- `src/easy-review/storage/types.ts` - Added StoredReview and StoredProjectAnalysis interfaces
- `src/easy-review/storage/StorageAdapter.ts` - Extended interface with four new Phase 2 method signatures
- `src/easy-review/storage/SQLiteStore.ts` - Implemented saveReview, getReviews, saveProjectAnalysis, getProjectAnalysis
- `src/shared/types.ts` - Replaced empty placeholder with full message protocol and review types
- `src/test/unit/sqlite.test.ts` - Converted 9 it.todo stubs to real passing tests

## Decisions Made

- Single-row policy for project_analyses enforced via DELETE + INSERT (not UPSERT) to guarantee exactly one row after any saveProjectAnalysis call
- Continued Phase 1 column aliasing pattern (AS camelName in SELECT) for new tables — no separate mapper function needed
- src/shared/types.ts kept browser-compatible — no vscode or Node.js-only imports so both extension host and Vite webview build can import it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt better-sqlite3 for system Node version**
- **Found during:** Task 1 GREEN verification
- **Issue:** better-sqlite3 had been electron-rebuilt (NODE_MODULE_VERSION 140) but system Node 20 requires MODULE_VERSION 115. All SQLiteStore tests were failing with ABI mismatch error. This was a pre-existing issue from Phase 1 electron-rebuild.
- **Fix:** Ran `npm rebuild better-sqlite3` to recompile the native addon for the test runner's Node version
- **Files modified:** node_modules/better-sqlite3 (compiled artifact only — no source changes)
- **Verification:** npm run test:unit exits 0, all 35 tests pass
- **Committed in:** (not committed — node_modules is gitignored)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock test verification. The ABI mismatch was a pre-existing condition from the electron-rebuild in Phase 1. Rebuilding for system Node enables unit tests to run; the extension still requires electron-rebuild for VS Code use.

## Issues Encountered

- better-sqlite3 ABI mismatch: the native addon was compiled for Electron (NODE_MODULE_VERSION 140) but the vitest runner uses system Node 20 (115). Fixed with `npm rebuild better-sqlite3`. Note: running `npm run rebuild:sqlite` (electron-rebuild) before VS Code use is still required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Storage layer is fully extended — downstream plans (02-03 through 02-09) can use saveReview/getReviews/saveProjectAnalysis/getProjectAnalysis via StorageAdapter
- Shared message protocol is defined — webview and extension host can import from src/shared/types.ts
- All four requirements marked complete: REV-04, REV-05, VIEW-03, PROJ-03
- Note: before running VS Code with the extension, run `npm run rebuild:sqlite` to recompile better-sqlite3 for Electron ABI

---
*Phase: 02-ai-review-generation*
*Completed: 2026-04-03*
