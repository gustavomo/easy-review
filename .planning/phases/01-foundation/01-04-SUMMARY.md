---
phase: 01-foundation
plan: 04
subsystem: ui
tags: [vscode, tree-view, github-api, octokit, sqlite, typescript]

# Dependency graph
requires:
  - phase: 01-foundation/01-03
    provides: SQLiteStore, StorageAdapter, StoredPR type

provides:
  - PRTreeItem: TreeItem with state badges (green/open, purple/merged, red/closed)
  - EasyReviewPRsProvider: flat list TreeDataProvider for 'easy-review.prList' view
  - AllStatesPRFetcher: fetchAllStatePRs + fetchPRByNumber wrapping Octokit
  - activateEasyReview: wires tree view, loads persisted PRs, registers commands
  - package.json: easy-review-container activitybar, easy-review.prList view, refreshPRList/openPRDiff commands

affects: [01-05-add-by-url, 01-06-cli-subprocess, phase-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat list TreeDataProvider pattern: getChildren returns empty array when element provided"
    - "State normalization pattern: pr.merged_at !== null maps GitHub closed+merged to 'merged' state"
    - "ThemeColor state badge pattern: charts.green/charts.purple/charts.red for open/merged/closed"
    - "Module-level provider/store references: getProvider()/getStore() exports for cross-command access"

key-files:
  created:
    - src/easy-review/providers/PRTreeItem.ts
    - src/easy-review/providers/EasyReviewPRsProvider.ts
    - src/easy-review/github/AllStatesPRFetcher.ts
    - resources/icons/easy-review.svg
  modified:
    - src/easy-review/activation.ts
    - package.json

key-decisions:
  - "Flat list only (not grouped by state) — D-04 decision: simplest rendering for all-states view"
  - "addPR/removePR methods on provider for future Plan 01-05 add-by-URL and removal without full refresh"
  - "Module-level _provider/_store refs with getProvider()/getStore() exports — enables Plan 01-05 commands to access provider without threading it through every call site"

patterns-established:
  - "State normalization: always check merged_at before state field from GitHub API"
  - "Flat TreeDataProvider: return [] for element, return this.prs for root"
  - "ThemeColor state badges: use charts.* color tokens for consistent theming"

requirements-completed: [PRW-01, PRW-02]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 01 Plan 04: PR Tree View Summary

**Sidebar tree view with colored state badges (green/purple/red) wired to SQLite-persisted PRs via EasyReviewPRsProvider, AllStatesPRFetcher, and package.json activity bar registration**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-03T18:24:00Z
- **Completed:** 2026-04-03T18:25:34Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- PRTreeItem with GitHub-conventional state badges: green for open, purple for merged, red for closed
- AllStatesPRFetcher normalizes GitHub's REST API (merged PRs come back as `state:closed` with `merged_at` set) to three distinct states
- EasyReviewPRsProvider as flat list TreeDataProvider with refresh/addPR/removePR for future command use
- activation.ts wires the full lifecycle: SQLite init, tree view creation, load persisted PRs, command registration
- package.json declares easy-review-container activitybar, easy-review.prList view, and both commands

## Task Commits

Each task was committed atomically:

1. **Task 1: PRTreeItem, AllStatesPRFetcher, EasyReviewPRsProvider** - `9e01236f` (feat)
2. **Task 2: Wire tree view into activation and package.json** - `b0c23964` (feat)

## Files Created/Modified

- `src/easy-review/providers/PRTreeItem.ts` - TreeItem with state badges and contextValue
- `src/easy-review/providers/EasyReviewPRsProvider.ts` - Flat list TreeDataProvider
- `src/easy-review/github/AllStatesPRFetcher.ts` - Octokit wrapper with merged_at normalization
- `src/easy-review/activation.ts` - Full activation: SQLite init, tree view, commands
- `package.json` - viewsContainers, views, commands for easy-review
- `resources/icons/easy-review.svg` - Placeholder activity bar icon

## Decisions Made

- Flat list (not grouped by state) per D-04 — simplest rendering, state is conveyed by badge color
- Added addPR/removePR to provider for Plan 01-05 add-by-URL without requiring full refresh
- Module-level getProvider()/getStore() exports so future commands can reach the provider without passing it as arguments

## Deviations from Plan

None — plan executed exactly as written. The linter auto-imported `parsePRUrl` in activation.ts (from a pre-existing file from Plan 01-03); this import is harmless as the file exists and was not removed.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- PRW-01 infrastructure complete: sidebar view and tree provider are registered
- PRW-02 is wired: openPRDiff command registered (full diff view requires Plan 01-05 for PR data)
- Plan 01-05 (Add by URL) can now call getProvider() and provider.addPR() directly
- Plan 01-06 (CLI subprocess) can access getStore() for persisting review results

---
*Phase: 01-foundation*
*Completed: 2026-04-03*
