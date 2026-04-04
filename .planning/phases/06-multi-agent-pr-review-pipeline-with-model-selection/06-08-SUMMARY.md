---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "08"
subsystem: ui
tags: [react, webview, vscode, progressive-rendering, multi-agent]

requires:
  - phase: 06-07
    provides: AgentStatusBar, AgentSlot, SectionPendingPlaceholder, DiagramErrorBanner components
  - phase: 06-06
    provides: AgentOrchestrator sectionUpdate message dispatch
  - phase: 06-02
    provides: AgentKey, SectionState, SectionStatus, ExtensionMessage sectionUpdate type in shared/types.ts

provides:
  - "ReviewDocument.tsx: 7-slot progressive layout — renders all 7 sections in AGENT_ORDER with SectionPendingPlaceholder for in-progress, section-specific renderers for complete"
  - "ReviewPanel.tsx: sectionUpdate message handler updating sections map reactively, AgentStatusBar wiring, agentSummary progress copy"
  - "convertParsedReviewToSections(): backward compat for stored ParsedReview with new sections-map API"
affects:
  - phase 06 end-to-end pipeline
  - future review display enhancements

tech-stack:
  added: []
  patterns:
    - "7-slot sections map: Partial<Record<AgentKey, SectionState>> as the unit of progressive review state"
    - "Section routing by keyword: titleLower.includes() with specificity ordering (bug→arch→visual→business→generic)"
    - "Diagram failure marker: content.includes('⚠️ diagram failed') triggers DiagramErrorBanner above raw fallback"
    - "Live sections during generation: StreamingView shown until first sectionUpdate, then ReviewDocument with live sections"

key-files:
  created: []
  modified:
    - src/webview/ReviewDocument.tsx
    - src/webview/ReviewPanel.tsx

key-decisions:
  - "ReviewDocument accepts Partial<Record<AgentKey, SectionState>> instead of ParsedReview — enables progressive rendering; convertParsedReviewToSections() bridges stored review format"
  - "StreamingView shown as fallback when no sectionUpdate received yet; ReviewDocument takes over once first section arrives"
  - "index.tsx unchanged — message routing stays inside ReviewPanel.tsx window.addEventListener pattern, sectionUpdate handled inline"
  - "agentSummary shown in PanelHeader beside elapsed counter during generation: 'N of 7 agents complete' / 'Review complete'"

patterns-established:
  - "Section routing specificity order: isBugRiskSection → isArchSection → isMermaidSection → isBusinessSection → generic (isMermaidSection before isBusinessSection prevents content.trimStart().startsWith('```mermaid') false-matching 'impact' check)"

requirements-completed: []

duration: 15min
completed: 2026-04-04
---

# Phase 06 Plan 08: 7-slot progressive layout + sectionUpdate wiring Summary

**ReviewDocument rewritten for 7-slot progressive rendering with keyword-routed section renderers; ReviewPanel wired for sectionUpdate messages and AgentStatusBar with live progress counter**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T17:59:40Z
- **Completed:** 2026-04-04T18:24:00Z
- **Tasks:** 2 (+ 1 pre-approved checkpoint)
- **Files modified:** 2

## Accomplishments
- ReviewDocument.tsx completely rewritten: accepts `Partial<Record<AgentKey, SectionState>>` sections map, renders all 7 sections in AGENT_ORDER regardless of agent completion order
- SectionPendingPlaceholder shown for pending/generating slots; section-specific renderers (FindingsSection, CategorizedChangesSection, MermaidDiagram, ImpactAnalysisSection, marked()) for complete slots
- DiagramErrorBanner + raw code fallback when orchestrator sets '⚠️ diagram failed' marker
- convertParsedReviewToSections() added for backward compat with stored ParsedReview format
- ReviewPanel.tsx handles sectionUpdate messages updating sections map reactively; AgentStatusBar rendered below PanelHeader during generation; agentSummary progress copy passed to PanelHeader

## Task Commits

Each task was committed atomically:

1. **Task 1: ReviewDocument.tsx — 7-slot progressive layout** - `60de2b30` (feat)
2. **Task 2: ReviewPanel.tsx + sectionUpdate handling** - `af89a9dd` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/webview/ReviewDocument.tsx` — Complete rewrite: AGENT_ORDER, SECTION_TITLES, 7-slot rendering, SectionPendingPlaceholder, DiagramErrorBanner, section routing, convertParsedReviewToSections
- `src/webview/ReviewPanel.tsx` — Added sections state, sectionUpdate handler, AgentStatusBar, agentSummary, StreamingView→ReviewDocument fallback logic

## Decisions Made
- ReviewDocument accepts `Partial<Record<AgentKey, SectionState>>` instead of `ParsedReview` — enables progressive rendering as sectionUpdate messages arrive; convertParsedReviewToSections() bridges stored review format for backward compat
- StreamingView shown as fallback when no sectionUpdate has arrived yet; once first section arrives, ReviewDocument takes over with live sections
- index.tsx unchanged — message routing stays inside ReviewPanel.tsx window.addEventListener, sectionUpdate handled inline following the existing pattern
- agentSummary displayed in PanelHeader beside elapsed counter: "N of 7 agents complete" / "Review complete"

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors (103 before, 105 after): all are `@shared/types` path alias not resolved by tsc directly (works via Vite), React UMD global errors (JSX transform pattern from Phase 02.3-04), and `marked` default import issue. These are pre-existing infrastructure issues across all webview files, not new bugs. Net new errors from this plan: +2 (additional JSX lines in larger ReviewDocument.tsx, same pattern as pre-existing).

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All files found. Both task commits verified in git history.

## Next Phase Readiness

- Phase 6 complete: full multi-agent PR review pipeline with progressive rendering wired end-to-end
- 7 parallel agents dispatch sectionUpdate messages; webview renders sections as they complete
- User sees live AgentStatusBar progress during generation
- Phase 7 (changes tree file icons + PR author) is independent and already complete
- Next: human verification of end-to-end pipeline in Extension Development Host

---
*Phase: 06-multi-agent-pr-review-pipeline-with-model-selection*
*Completed: 2026-04-04*
