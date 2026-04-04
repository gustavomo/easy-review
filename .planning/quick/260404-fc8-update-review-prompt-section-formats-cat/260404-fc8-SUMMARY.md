---
phase: quick
plan: 260404-fc8
subsystem: ai-review
tags: [prompt-engineering, claude, synthesis, markdown-tables]

requires: []
provides:
  - Updated SYNTHESIS_INSTRUCTION with machine-parseable table/list formats for Categorized Changes, Code Review Findings, and Impact Analysis
affects: [ReviewDocument, CategorizedChangesSection, ImpactAnalysisSection, CodeReviewFindingsSection]

tech-stack:
  added: []
  patterns:
    - "SYNTHESIS_INSTRUCTION section format: markdown tables preferred over bullet lists for structured data sections"
    - "Code Review Findings: flat prefixed list with **[severity]** bold tags for programmatic parsing"

key-files:
  created: []
  modified:
    - src/easy-review/cli/PromptBuilder.ts

key-decisions:
  - "Categorized Changes switches to markdown table (Category | Files Changed | Description) — enables React component to parse and render structured file groups"
  - "Code Review Findings switches to flat prefixed list with **[critical/warning/suggestion]** bold tags — consistent with severity tag pattern used by React components"
  - "Impact Analysis switches to markdown table (Area | Risk | Notes) — risk values normalized to Low/Low-positive/Medium/High/Positive"

requirements-completed: []

duration: 5min
completed: 2026-04-04
---

# Quick Task 260404-fc8: Update Review Prompt Section Formats Summary

**Three SYNTHESIS_INSTRUCTION sections updated from prose/bullets to markdown tables and a bold-prefixed flat list, making Categorized Changes, Code Review Findings, and Impact Analysis machine-parseable by existing React components.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T04:00:00Z
- **Completed:** 2026-04-04T04:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced Categorized Changes bullet category list with a markdown table specifying `Category | Files Changed | Description` columns and enumerated category values
- Replaced Code Review Findings paragraph grouping with a flat prefixed list using `**[critical]**`, `**[warning]**`, `**[suggestion]**` bold severity tags
- Replaced Impact Analysis bullet-field format with a markdown table specifying `Area | Risk | Notes` columns and normalized risk values

## Task Commits

1. **Task 1: Update three section format instructions in SYNTHESIS_INSTRUCTION** - `c8009d48` (feat)

## Files Created/Modified

- `src/easy-review/cli/PromptBuilder.ts` - Updated `SYNTHESIS_INSTRUCTION` const: three sections now instruct Claude to output tables/prefixed lists instead of prose/bullets

## Decisions Made

- Kept example rows in the prompt for each section (shows Claude the exact expected format, not just description)
- Risk column in Impact Analysis now uses an explicit enumerated set (Low, Low-positive, Medium, High, Positive) instead of the prior free-form "low / medium / high" — removes ambiguity and adds `Positive` for beneficial-impact areas

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in unrelated files (ReviewPanel.ts, webview TSX components) were present before this task and are out of scope.

## Next Phase Readiness

- SYNTHESIS_INSTRUCTION now produces structured output that React components (CategorizedChangesSection, ImpactAnalysisSection) can parse via their existing table/list parsers
- If React components were previously wired to expect the old prose format, they will now benefit from the structured input without code changes

---
*Phase: quick*
*Completed: 2026-04-04*

## Self-Check: PASSED

- `src/easy-review/cli/PromptBuilder.ts` — FOUND (modified)
- Commit `c8009d48` — FOUND
- `| Category | Files Changed | Description |` — FOUND at line 64
- `**[critical]**` — FOUND at line 122
- `| Area | Risk | Notes |` — FOUND at line 130
- Old text "Group changed files by type" — absent (VERIFIED)
- Old text "Group by severity" — absent (VERIFIED)
- Old text "Areas affected" — absent (VERIFIED)
