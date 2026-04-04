---
phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
plan: 03
subsystem: ai
tags: [prompt-engineering, synthesis-instruction, review-parser, section-headings]

# Dependency graph
requires:
  - phase: 05-02
    provides: "BuildPromptOptions reviewComments+prUrl fields (implemented inline here since 05-02 ran in parallel)"
provides:
  - "SYNTHESIS_INSTRUCTION const in PromptBuilder.ts — full 240-line verbatim prompt from Privanote"
  - "Renamed section headings: ## Code Review Findings, ## Visual Overview"
  - "ReviewComment interface and reviewComments/prUrl fields in BuildPromptOptions"
  - "Backward-compatible ReviewParser: normalizedTitle.includes('finding') matches both old and new headings"
  - "8 review-parser tests including 2 new backward-compat tests"
  - "9 prompt-builder tests including 3 new field/rendering tests"
affects: [05-04, ReviewRunner, ReviewPanel, ReviewDocument]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SYNTHESIS_INSTRUCTION: top-level const pattern for large prompt blocks — separated from buildPrompt() logic"
    - "Backward-compatible section matching: includes('finding') substring match covers both ## Findings and ## Code Review Findings"

key-files:
  created: []
  modified:
    - src/easy-review/cli/PromptBuilder.ts
    - src/test/unit/prompt-builder.test.ts
    - src/test/unit/review-parser.test.ts

key-decisions:
  - "ReviewComment interface defined inline in PromptBuilder.ts — avoids import ordering issues with parallel plan 05-02 running in separate worktree"
  - "Plan 05-02 dependency implemented inline (reviewComments+prUrl fields) as Rule 3 deviation — blocking issue from missing dependency"
  - "ReviewParser.ts left unchanged — normalizedTitle.includes('finding') already handles ## Code Review Findings as substring match"

patterns-established:
  - "SYNTHESIS_INSTRUCTION pattern: top-level const for large verbatim prompt blocks keeps buildPrompt() clean"
  - "Backward-compat heading matching: includes() substring check is forward-compatible — no need for exhaustive OR chains"

requirements-completed: [D-01, D-02, D-03, D-10, D-11, D-12]

# Metrics
duration: 8min
completed: 2026-04-04
---

# Phase 05 Plan 03: Upgrade Review Prompt to Generate Deep Insight-Rich PR Analysis Summary

**Replaced 8-line instructions stub with 240-line SYNTHESIS_INSTRUCTION from Privanote; renamed ## Findings -> ## Code Review Findings and ## Mermaid Diagram -> ## Visual Overview; extended BuildPromptOptions with reviewComments+prUrl; all 17 tests green**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-04T03:10:00Z
- **Completed:** 2026-04-04T03:18:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced thin 8-line instructions block with full 240-line SYNTHESIS_INSTRUCTION verbatim from Privanote (D-01, D-02, D-03)
- Renamed both output section headings per D-10: ## Code Review Findings (was ## Findings) and ## Visual Overview (was ## Mermaid Diagram)
- Extended BuildPromptOptions with reviewComments and prUrl fields; added full review comments rendering logic (D-04, D-06, D-07)
- Updated SIX_SECTION_REVIEW fixture in review-parser.test.ts to use new heading names
- Added 2 new backward-compat tests confirming includes('finding') handles both old ## Findings and new ## Code Review Findings

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace PromptBuilder.ts instructions block with SYNTHESIS_INSTRUCTION** - `3b2643ae` (feat)
2. **Task 2: Update review-parser.test.ts fixture; verify ReviewParser backward compat** - `87234f71` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified
- `src/easy-review/cli/PromptBuilder.ts` - SYNTHESIS_INSTRUCTION const + ReviewComment interface + reviewComments/prUrl fields + updated buildPrompt()
- `src/test/unit/prompt-builder.test.ts` - Updated all buildPrompt calls with new fields; added 3 new tests for prUrl, empty reviewComments, and populated reviewComments
- `src/test/unit/review-parser.test.ts` - Updated SIX_SECTION_REVIEW fixture for new headings; added 2 backward-compat tests

## Decisions Made
- ReviewComment interface defined inline in PromptBuilder.ts rather than importing from DiffFetcher.ts — avoids cross-plan import ordering issues in parallel execution
- Rule 3 deviation: added reviewComments+prUrl fields from plan 05-02 scope inline, since plan 05-02 was running in parallel and the test assertions in plan 05-03 required those fields
- ReviewParser.ts unchanged — existing `normalizedTitle.includes('finding')` already matches '## Code Review Findings' as a substring (no code change permitted per plan spec)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Implemented reviewComments+prUrl fields inline (plan 05-02 dependency not yet present)**
- **Found during:** Task 1 (Replace PromptBuilder.ts instructions block)
- **Issue:** Plan 05-03's test assertions require `buildPrompt()` to accept `reviewComments` and `prUrl` fields (from plan 05-02), but plan 05-02 was running in a parallel worktree and had not yet been merged. TypeScript would fail to compile the tests without these fields.
- **Fix:** Added ReviewComment interface and reviewComments/prUrl fields directly in PromptBuilder.ts, along with the review comments rendering section. This duplicates plan 05-02 scope but is isolated to this worktree.
- **Files modified:** src/easy-review/cli/PromptBuilder.ts, src/test/unit/prompt-builder.test.ts
- **Verification:** All 9 prompt-builder tests pass green
- **Committed in:** 3b2643ae (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary to satisfy test compilation in isolated worktree. When plan 05-02 is merged, there may be a duplicate ReviewComment interface — plan 05-04 or a merge-time reconciliation should dedup the import.

## Issues Encountered
None — both test suites passed on first run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SYNTHESIS_INSTRUCTION is now the active prompt instruction block
- Both renamed section headings (Code Review Findings, Visual Overview) are in effect
- ReviewParser backward compat confirmed for stored reviews using old heading names
- Plan 05-04 can proceed with ReviewRunner and ReviewPanel integration (uses reviewComments+prUrl fields)

---
*Phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: src/easy-review/cli/PromptBuilder.ts
- FOUND: src/test/unit/prompt-builder.test.ts
- FOUND: src/test/unit/review-parser.test.ts
- FOUND commit: 3b2643ae (Task 1)
- FOUND commit: 87234f71 (Task 2)
- FOUND commit: d5073f57 (plan metadata)
- FOUND: `const SYNTHESIS_INSTRUCTION` in PromptBuilder.ts
- FOUND: `## Code Review Findings` in PromptBuilder.ts
- FOUND: `## Visual Overview` in PromptBuilder.ts
- FOUND: `includes('finding')` in ReviewParser.ts
- FOUND: `## Visual Overview` in review-parser.test.ts
