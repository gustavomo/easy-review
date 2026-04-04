---
phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
plan: 02
subsystem: github
tags: [github, octokit, prompt-builder, review-comments, diff-fetcher, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: wave 0 tests for github-fetchers and prompt-builder test infrastructure
provides:
  - fetchReviewComments function in DiffFetcher.ts
  - fetchPRCommits function in DiffFetcher.ts
  - ReviewComment interface exported from DiffFetcher.ts
  - BuildPromptOptions extended with reviewComments and prUrl fields
  - buildPrompt() renders review comments section and PR URL
affects: [05-03, 05-04, ReviewPanel callers of buildPrompt]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Octokit type cast via (octokit as any) for REST endpoints not in TypeScript types"
    - "per_page: 100 on all paginated GitHub API calls — sufficient for typical PRs"
    - "Inline c.line ?? c.original_line fallback for GitHub diff comment line numbers"
    - "Empty body guard r.body?.trim() to exclude whitespace-only PR reviews"
    - "Subject-line extraction via message.split('\\n')[0] for commit messages"

key-files:
  created: []
  modified:
    - src/easy-review/github/DiffFetcher.ts
    - src/easy-review/cli/PromptBuilder.ts

key-decisions:
  - "PromptBuilder.ts imports ReviewComment from DiffFetcher.ts (instead of inline definition) — single source of truth now that DiffFetcher.ts exports it"
  - "ReviewComment re-exported from PromptBuilder.ts via export type for backward compatibility"

patterns-established:
  - "DiffFetcher.ts is the canonical source for ReviewComment interface"
  - "PromptBuilder.ts imports types from DiffFetcher.ts — dependency direction: PromptBuilder -> DiffFetcher"

requirements-completed: [D-04, D-05, D-06, D-07, D-08]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 05 Plan 02: GitHub Fetchers and PromptBuilder Interface Extension Summary

**fetchReviewComments and fetchPRCommits added to DiffFetcher.ts; ReviewComment imported in PromptBuilder.ts; all 19 unit tests green**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T03:20:00Z
- **Completed:** 2026-04-04T03:21:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `fetchReviewComments` to DiffFetcher.ts — combines line-level diff comments and PR-level review bodies; excludes empty/whitespace bodies; uses per_page: 100
- Added `fetchPRCommits` to DiffFetcher.ts — extracts subject line only via `split('\n')[0]`; uses per_page: 100
- Exported `ReviewComment` interface from DiffFetcher.ts as canonical definition
- Updated PromptBuilder.ts to import `ReviewComment` from DiffFetcher.ts (replacing prior inline definition) — single source of truth established
- All 10 github-fetchers tests pass; all 9 prompt-builder tests pass (19 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add fetchReviewComments and fetchPRCommits to DiffFetcher.ts** - `04952d18` (feat)
2. **Task 2: Import ReviewComment from DiffFetcher in PromptBuilder.ts** - `25461d53` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/easy-review/github/DiffFetcher.ts` - Added ReviewComment interface, fetchReviewComments, fetchPRCommits
- `src/easy-review/cli/PromptBuilder.ts` - Replaced inline ReviewComment with import from DiffFetcher.ts

## Decisions Made
- PromptBuilder.ts already had the `reviewComments` and `prUrl` fields from a prior partial implementation — only the import source needed updating. No re-implementation needed.
- Chose to import from DiffFetcher.ts (not keep inline) now that DiffFetcher.ts exports the type — eliminates duplicate definition.

## Deviations from Plan

### Deviation 1 — Prior Partial Implementation Discovered

The plan assumed PromptBuilder.ts would need full implementation of reviewComments/prUrl fields. On reading the file, it already had all fields and rendering logic from a prior state. Only the import source needed updating (inline definition → import from DiffFetcher.ts).

- **Impact:** Task 2 was smaller than expected. No scope creep — criteria met.
- **Verification:** All 9 prompt-builder tests pass including the 3 new ones for D-04, D-07, D-06.

---

**Total deviations:** 1 observation (prior partial work discovered, not a rule violation)
**Impact on plan:** Smaller task 2 scope. All acceptance criteria met.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DiffFetcher.ts exports all three: `fetchPRDiff`, `fetchReviewComments`, `fetchPRCommits`, `ReviewComment`
- BuildPromptOptions has `reviewComments: ReviewComment[]` and `prUrl: string`
- Plan 03 (SYNTHESIS_INSTRUCTION rewrite) can proceed — PromptBuilder interface is ready
- Plan 04 (ReviewPanel wiring) will add the new fields to ReviewPanel.ts callers

---
*Phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis*
*Completed: 2026-04-04*
