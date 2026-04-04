---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "07"
subsystem: webview-components
tags: [react, webview, progressive-rendering, agent-status]
dependency_graph:
  requires: ["06-02"]
  provides: ["AgentStatusBar", "AgentSlot", "SectionPendingPlaceholder", "DiagramErrorBanner", "CollapsibleSection.statusSlot", "PanelHeader.agentSummary"]
  affects: ["06-08"]
tech_stack:
  added: []
  patterns: ["color-mix tinted backgrounds", "codicon state icons", "er-spin shared keyframe"]
key_files:
  created:
    - src/webview/AgentStatusBar.tsx
    - src/webview/AgentSlot.tsx
    - src/webview/SectionPendingPlaceholder.tsx
    - src/webview/DiagramErrorBanner.tsx
  modified:
    - src/webview/CollapsibleSection.tsx
    - src/webview/PanelHeader.tsx
decisions:
  - "er-spin @keyframes already extracted to webview.css — new components reference it directly, no inline style tag needed"
  - "AgentSlot separates displayName from state label with opacity:0.8 on state span — matches chip chip typographic hierarchy"
  - "PanelHeader agentSummary rendered inside the isGenerating branch (not always shown) — matches spec placement beside ElapsedCounter"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 6
---

# Phase 06 Plan 07: Progressive Rendering UI Components Summary

**One-liner:** 4 new webview components (AgentStatusBar, AgentSlot, SectionPendingPlaceholder, DiagramErrorBanner) + optional props on CollapsibleSection and PanelHeader for progressive rendering pipeline.

## What Was Built

### New Components

**AgentSlot** (`src/webview/AgentSlot.tsx`)
Single chip rendering one agent's name + codicon + state label. State-driven colors via `color-mix(in srgb, {var} 15%, transparent)` tinted backgrounds — same pattern as ImpactAnalysisSection. Four states: pending (clock icon, muted), generating (loading spinner + er-spin, badge background tint), complete (check icon, green tint), error (error icon, red tint). Tooltip via `title` attribute.

**AgentStatusBar** (`src/webview/AgentStatusBar.tsx`)
Horizontal flex strip of 7 AgentSlot chips. Hardcoded `AGENT_ORDER` and `AGENT_DISPLAY_NAMES` map per UI-SPEC copywriting contract. Defaults missing keys to `{ status: 'pending' }`. Container: `display: flex; gap: 8px; flex-wrap: wrap; padding: 8px 32px` per UI-SPEC.

**SectionPendingPlaceholder** (`src/webview/SectionPendingPlaceholder.tsx`)
Spinner + copy placeholder shown inside CollapsibleSection while an agent is running. Default copy: "Generating...". Accepts optional `copy` prop for "Validating diagram..." during Mermaid retry. Uses er-spin shared keyframe from webview.css.

**DiagramErrorBanner** (`src/webview/DiagramErrorBanner.tsx`)
Static warning banner for persistent Mermaid validation failure (D-18). Warning left-border (`3px solid var(--vscode-list-warningForeground)`), codicon-warning icon, fixed copy "Diagram failed to render — raw output shown below." Not dismissible.

### Updated Components

**CollapsibleSection** — added optional `statusSlot?: React.ReactNode` prop rendered inline in the title row after the title text. Existing usage unaffected (defaults to null).

**PanelHeader** — added optional `agentSummary?: string` prop. When provided and `isGenerating` is true, renders a muted 13px span beside the ElapsedCounter showing e.g. "3 of 7 complete".

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All components are fully implemented. Wiring into ReviewDocument and ReviewPanel is planned for Plan 06-08.

## Self-Check: PASSED

Files created:
- src/webview/AgentStatusBar.tsx — FOUND
- src/webview/AgentSlot.tsx — FOUND
- src/webview/SectionPendingPlaceholder.tsx — FOUND
- src/webview/DiagramErrorBanner.tsx — FOUND

Files modified:
- src/webview/CollapsibleSection.tsx contains "statusSlot" — FOUND
- src/webview/PanelHeader.tsx contains "agentSummary" — FOUND

Commits:
- a4652e79 feat(06-07): add AgentSlot and AgentStatusBar components — FOUND
- 93e55c21 feat(06-07): add SectionPendingPlaceholder, DiagramErrorBanner; update CollapsibleSection + PanelHeader — FOUND
