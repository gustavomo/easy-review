---
phase: 02-ai-review-generation
plan: 08
subsystem: ai-review
tags: [vscode-extension, project-analysis, commands, sqlite, octokit, subprocess]

# Dependency graph
requires:
  - phase: 02-07
    provides: ReviewPanel.getOrCreate() and startReview() for the generateReview command to call
  - phase: 02-02
    provides: StorageAdapter.saveProjectAnalysis() and getProjectAnalysis() interfaces
provides:
  - ProjectAnalysisService with collectProjectContext() and fetchPRHistory()
  - easyReview.generateReview command wired end-to-end to ReviewPanel
  - easyReview.analyzeProject command wired to collectProjectContext + saveProjectAnalysis
  - easyReview.analyzePRHistory command wired to fetchPRHistory + storage append
  - easyReview.codexPath and easyReview.activeModel VS Code settings
  - generateReview in PR tree item right-click context menu
affects: [03-mcp-integration, 04-packaging, any phase consuming project analysis context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "collectProjectContext: reads README.md + package.json + src/ listing + last 20 git commits into context_text blob"
    - "fetchPRHistory: fetches 100 PRs via octokit.rest.pulls.list and formats as Markdown section"
    - "analyzePRHistory appends to existing project analysis or creates new row if none exists"
    - "generateReview command uses item.pr from PRTreeItem context value (contextValue =~ /^pr-/)"

key-files:
  created:
    - src/easy-review/github/ProjectAnalysisService.ts
  modified:
    - src/easy-review/activation.ts
    - src/test/unit/project-analysis.test.ts
    - package.json

key-decisions:
  - "contextValue for PR tree items is pr-${state} (e.g., pr-open) — generateReview menu uses viewItem =~ /^pr-/ to match all states"
  - "analyzePRHistory appends history section to existing contextText rather than replacing — preserves workspace analysis"
  - "easyReview.activeModel enum with claude|codex default claude — matches D-05 requirement"

patterns-established:
  - "ProjectAnalysisService: file-system reads wrapped in try/catch with silent skip, not throw — resilient collection"
  - "runGitLog: Promise-wrapped cp.exec, resolves empty string on error — never rejects"

requirements-completed: [REV-01, PROJ-01, PROJ-02, PROJ-03]

# Metrics
duration: 18min
completed: 2026-04-03
---

# Phase 02 Plan 08: Wire Commands and ProjectAnalysisService Summary

**ProjectAnalysisService (README + package.json + src listing + git log) plus three new VS Code commands closing the end-to-end review generation loop**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-03T21:35:00Z
- **Completed:** 2026-04-03T21:53:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ProjectAnalysisService.ts created with `collectProjectContext()` and `fetchPRHistory()`, all 8 unit tests passing
- `easyReview.generateReview` registered and wired to `ReviewPanel.getOrCreate().startReview()` — closes the full end-to-end review loop
- `easyReview.analyzeProject` and `easyReview.analyzePRHistory` registered with progress notifications and error handling
- `easyReview.codexPath` and `easyReview.activeModel` settings added to package.json (D-05)
- `easyReview.generateReview` added to PR tree item right-click context menu (`viewItem =~ /^pr-/`)

## Task Commits

Each task was committed atomically:

1. **Task 1: ProjectAnalysisService (TDD)** - `84be4cdd` (feat)
2. **Task 2: Register commands in activation.ts and add settings to package.json** - `834c8476` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/easy-review/github/ProjectAnalysisService.ts` - collectProjectContext() + fetchPRHistory() implementation
- `src/test/unit/project-analysis.test.ts` - replaced all it.todo stubs with real passing tests (8 tests)
- `src/easy-review/activation.ts` - added imports for ReviewPanel, ProjectAnalysisService; registered 3 new commands
- `package.json` - added easyReview.codexPath, easyReview.activeModel settings; added 3 commands to contributes.commands; added generateReview to view/item/context menu

## Decisions Made

- `contextValue` for PR tree items is `pr-${state}` (e.g., `pr-open`, `pr-closed`, `pr-merged`) — the generateReview menu entry uses `viewItem =~ /^pr-/` to match all states, consistent with the existing removePR entry
- `analyzePRHistory` appends history section to existing contextText rather than replacing — preserves workspace analysis data already collected
- `easyReview.activeModel` defaults to `claude` with enum `[claude, codex]` — matches D-05

## Deviations from Plan

None - plan executed exactly as written. The only minor adaptation was using `viewItem =~ /^pr-/` (matching all PR states) instead of `viewItem == pr` as suggested in the plan, because the actual contextValue is `pr-${state}` not `pr`. This was discovered by reading PRTreeItem.ts and is the correct behavior.

## Issues Encountered

None. The pre-existing `sqlite.test.ts` failures (better-sqlite3 native module ABI mismatch with system Node) are unrelated to this plan and documented in STATE.md as a known blocker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 02 is now complete. All 9 plans executed.
- Full end-to-end review generation is wired: right-click PR → easyReview.generateReview → ReviewPanel.startReview → DiffFetcher → PromptBuilder → ReviewRunner → ReviewParser → store.saveReview → webview reviewComplete
- Phase 03 (MCP integration) can proceed — ProjectAnalysisService provides the context_text that MCP will enrich
- Phase 04 (packaging) can proceed — all settings registered in package.json

## Self-Check: PASSED

- FOUND: src/easy-review/github/ProjectAnalysisService.ts
- FOUND: src/easy-review/activation.ts (with generateReview, analyzeProject, analyzePRHistory)
- FOUND: .planning/phases/02-ai-review-generation/02-08-SUMMARY.md
- FOUND commit: 84be4cdd (ProjectAnalysisService)
- FOUND commit: 834c8476 (commands + settings)
- easyReview.activeModel present in package.json

---
*Phase: 02-ai-review-generation*
*Completed: 2026-04-03*
