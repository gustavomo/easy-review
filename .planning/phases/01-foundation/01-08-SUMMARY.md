---
phase: 01-foundation
plan: 08
subsystem: github
tags: [octokit, credentials, authentication, sqlite, addPRByUrl]

# Dependency graph
requires:
  - phase: 01-07
    provides: openPRDiff handler in activation.ts (prerequisite to avoid file conflict)
  - phase: 01-05
    provides: PRPersistenceService.fetchAndPersistPR implementation
provides:
  - activateEasyReview accepts optional credentialStore parameter
  - addPRByUrl command calls PRPersistenceService.fetchAndPersistPR with real Octokit
  - activateEasyReview called from deferredActivate after credentialStore.create()
affects: [02-ai-review, future phases using Octokit in activation context]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CredentialStore passed as optional parameter to activateEasyReview for testability"]

key-files:
  created: []
  modified:
    - src/easy-review/activation.ts
    - src/extension.ts

key-decisions:
  - "activateEasyReview moved from activate() into deferredActivate() so credentialStore is available when it runs"
  - "credentialStore parameter is optional (?) to preserve backward compatibility with unit tests that call activateEasyReview without it"

patterns-established:
  - "Pattern: Pass upstream services as optional parameters to activateEasyReview rather than threading through global state"

requirements-completed: [PRW-02]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 01 Plan 08: Octokit Wiring into addPRByUrl Summary

**CredentialStore wired into activateEasyReview — addPRByUrl now fetches PRs from GitHub via Octokit and persists them to SQLite**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T18:58:24Z
- **Completed:** 2026-04-03T19:01:35Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced "Octokit integration pending" stub in addPRByUrl with real CredentialStore.getHub() call
- Added CredentialStore, AuthProvider, PRPersistenceService imports to activation.ts
- Moved activateEasyReview call from activate() into deferredActivate() so credentialStore is available
- Full add-by-URL flow is now reachable: paste URL -> getHub() -> fetchAndPersistPR() -> sidebar refresh

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire CredentialStore into activateEasyReview and implement addPRByUrl** - `8d564376` (feat)
2. **Task 2: Pass credentialStore to activateEasyReview from extension.ts** - `077c5727` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `src/easy-review/activation.ts` - Added CredentialStore/AuthProvider/PRPersistenceService imports, optional credentialStore param, replaced stub with real Octokit call
- `src/extension.ts` - Moved activateEasyReview call into deferredActivate after credentialStore.create(), removed standalone call from activate()

## Decisions Made
- credentialStore parameter made optional (`?`) so existing unit tests that call activateEasyReview without it continue to pass — they exercise the "not signed in" error path cleanly
- activateEasyReview moved into deferredActivate rather than using a module-level variable to store credentialStore — avoids mutable shared state and keeps the dependency explicit

## Deviations from Plan

None — plan executed exactly as written. activation.ts already had all Task 1 changes applied as uncommitted working tree changes (consistent with the objective noting 01-07 was already completed). Committed them as Task 1 per plan.

## Issues Encountered

None. Build and all 26 unit tests passed after both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Gap 2 (Octokit not wired into addPRByUrl) is fully closed
- Phase 01 foundation is complete: storage, tree view, CLI subprocess, PR persistence, open-in-browser, and add-by-URL all working
- Phase 02 (AI review generation) can proceed: Octokit is available in the activation context for fetching PR diffs

---
*Phase: 01-foundation*
*Completed: 2026-04-03*
