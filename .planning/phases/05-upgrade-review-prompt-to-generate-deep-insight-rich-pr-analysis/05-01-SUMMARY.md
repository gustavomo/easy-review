---
phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
plan: 01
subsystem: testing
tags: [vitest, octokit, github, tdd, wave-0]

# Dependency graph
requires:
  - phase: 02-ai-review-generation
    provides: DiffFetcher.ts pattern for GitHub API fetchers, vitest test infrastructure
provides:
  - Wave 0 failing test scaffold for fetchReviewComments and fetchPRCommits
affects:
  - 05-02 (implementation of fetchReviewComments and fetchPRCommits in DiffFetcher.ts must satisfy these tests)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "makeOctokit() factory function pattern for mocking Octokit REST endpoints in vitest tests"
    - "Wave 0 TDD: test file written before implementation file — tests fail with 'is not a function' until Plan 02 adds exports"

key-files:
  created:
    - src/test/unit/github-fetchers.test.ts
  modified: []

key-decisions:
  - "Wave 0 test scaffold created before implementation — 10 tests all fail with TypeError proving real failing tests not stubs"
  - "makeOctokit() factory pattern used instead of vi.mock() to allow per-test Octokit override without module-level coupling"

patterns-established:
  - "Pattern: Octokit mock factory with per-test override — makeOctokit({ listReviewComments: vi.fn()... }) instead of global vi.mock"

requirements-completed: [D-05, D-08]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 05 Plan 01: GitHub Fetchers Wave 0 Test Scaffold Summary

**10-test vitest scaffold for fetchReviewComments and fetchPRCommits covering per_page:100, empty-body filter, original_line fallback, and subject-line extraction — all failing with TypeError until Plan 02 adds the exports**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T03:12:00Z
- **Completed:** 2026-04-04T03:17:08Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/test/unit/github-fetchers.test.ts` with 10 tests across two describe blocks
- All 10 tests fail with "is not a function" — confirming real failing scaffold, not no-op tests
- Covers all documented pitfalls: Pitfall 1 (per_page:100), Pitfall 2 (empty-body filter), Pitfall 6 (subject-line extraction)
- Import path `../../easy-review/github/DiffFetcher` references the exact location Plan 02 will write the functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write github-fetchers.test.ts scaffold** - `1f874f05` (test)

## Files Created/Modified

- `src/test/unit/github-fetchers.test.ts` - Wave 0 test scaffold: 10 failing tests for fetchReviewComments (6 tests) and fetchPRCommits (4 tests) with mocked Octokit

## Decisions Made

- Used makeOctokit() factory function over vi.mock() module mocking — allows per-test override of specific endpoints without resetting the whole module mock between tests; cleaner and more explicit
- Inlined ReviewComment interface in test file (mirroring what DiffFetcher.ts will export) to ensure the test assertions are type-checked without depending on the not-yet-existing export

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — vitest parses and executes the test file correctly; all 10 tests fail with "TypeError: fetchReviewComments is not a function" and "TypeError: fetchPRCommits is not a function" as expected for Wave 0.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 scaffold committed; Plan 02 can now implement `fetchReviewComments` and `fetchPRCommits` in `DiffFetcher.ts` to turn these 10 tests green
- No blockers

---
*Phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis*
*Completed: 2026-04-04*
