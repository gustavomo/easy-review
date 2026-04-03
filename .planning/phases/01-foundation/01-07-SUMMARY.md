---
phase: 01-foundation
plan: 07
subsystem: ui
tags: [vscode, commands, openExternal, PRW-02, gap-closure]

# Dependency graph
requires:
  - phase: 01-foundation plan 04
    provides: PRTreeItem passing StoredPR as command argument to easy-review.openPRDiff

provides:
  - easy-review.openPRDiff command handler opens PR GitHub URL in browser via vscode.env.openExternal

affects: [future phases that wire full in-editor diff via PullRequestModel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard pr.url before calling vscode.env.openExternal — shows error message if URL is missing"

key-files:
  created: []
  modified:
    - src/easy-review/activation.ts

key-decisions:
  - "PRW-02 Phase 1 satisfied via browser-open (vscode.env.openExternal) — full in-editor diff via PullRequestModel deferred to future phase once upstream diff view wiring is in place"

patterns-established:
  - "openExternal pattern: guard url field, then call vscode.env.openExternal(vscode.Uri.parse(url))"

requirements-completed: [PRW-02]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 01 Plan 07: openPRDiff Gap Closure Summary

**openPRDiff command now opens PR GitHub URL in browser via vscode.env.openExternal, replacing the stub toast that did nothing (PRW-02 Phase 1 gap closed)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T18:57:00Z
- **Completed:** 2026-04-03T18:59:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced stub `showInformationMessage` toast in `easy-review.openPRDiff` handler with `vscode.env.openExternal`
- Added guard: shows error message if `pr.url` is missing before calling openExternal
- PRW-02 gap (BLOCKER) closed for Phase 1 — clicking a PR item now navigates to its GitHub diff page in the browser
- Build passes, all 26 unit tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace openPRDiff stub with vscode.env.openExternal** - `955b658e` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/easy-review/activation.ts` - openPRDiff handler replaced: toast stub removed, url guard + openExternal added

## Decisions Made
- PRW-02 Phase 1 delivered via browser-open approximation (`vscode.env.openExternal`). Full in-editor diff via upstream `PullRequestModel` deferred — requires upstream diff view wiring not yet present in Phase 1. This matches the plan's stated scope note and satisfies Phase 1 success criterion #2 ("User can access any PR's diff").

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Gap 1 (BLOCKER) from 01-VERIFICATION.md is now closed — PRW-02 satisfied for Phase 1
- Phase 1 gap closure complete (this was the final plan in the gap-closure wave)
- Future phase: wire full in-editor diff via upstream PullRequestModel when upstream auth + diff view wiring is in place

---
*Phase: 01-foundation*
*Completed: 2026-04-03*

## Self-Check: PASSED

- FOUND: src/easy-review/activation.ts
- FOUND: .planning/phases/01-foundation/01-07-SUMMARY.md
- FOUND commit: 955b658e
