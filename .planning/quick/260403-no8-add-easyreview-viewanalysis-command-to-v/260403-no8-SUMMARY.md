---
phase: quick
plan: 260403-no8
subsystem: easy-review/webview
tags: [command, webview, protocol, ui]
requirements: [VIEW-04]

dependency_graph:
  requires: []
  provides: [easyReview.viewAnalysis command, hasAnalysis stateSync field, View Last Analysis button]
  affects: [src/shared/types.ts, src/easy-review/activation.ts, src/easy-review/panel/ReviewPanel.ts, src/webview/IdleView.tsx, src/webview/ReviewPanel.tsx, package.json]

tech_stack:
  added: []
  patterns: [untitled-document-preview, stateSync-helper-method, conditional-webview-button]

key_files:
  created: []
  modified:
    - src/shared/types.ts
    - src/easy-review/activation.ts
    - src/easy-review/panel/ReviewPanel.ts
    - src/webview/IdleView.tsx
    - src/webview/ReviewPanel.tsx
    - package.json

decisions:
  - "untitled: URI scheme used for analysis document — no file written to disk, .md suffix enables syntax highlighting"
  - "postStateSync() private helper added to ReviewPanel — eliminates duplication across ready and requestState handlers"
  - "hasAnalysis is boolean (not date) on stateSync — analysisDate carried alongside for future use but IdleView only needs presence check"

metrics:
  duration: ~8 minutes
  completed: 2026-04-03
  tasks_completed: 3
  files_modified: 6
---

# Quick 260403-no8: Add easyReview.viewAnalysis Command to VS Code Summary

**One-liner:** easyReview.viewAnalysis command opens stored project contextText as an untitled .md preview in ViewColumn.Beside, surfaced via a conditional "View Last Analysis" button in IdleView driven by hasAnalysis from stateSync.

## What Was Built

Three coordinated changes across the extension host and webview to satisfy VIEW-04:

1. **Message protocol extension** (`src/shared/types.ts`): Added `viewAnalysis` to `WebviewMessage` union; extended `stateSync` ExtensionMessage with `hasAnalysis: boolean` and `analysisDate?: number`.

2. **Extension host wiring** (`activation.ts`, `panel/ReviewPanel.ts`):
   - Registered `easyReview.viewAnalysis` command — fetches `StorageAdapter.getProjectAnalysis()`, shows error if none, otherwise opens `untitled:easy-review-analysis-{ts}.md` in `ViewColumn.Beside` and inserts `contextText` via `editor.edit()`.
   - Added `postStateSync()` private helper to `ReviewPanel` that reads `store.getProjectAnalysis()` and includes `hasAnalysis`/`analysisDate` on every stateSync dispatch.
   - Replaced both raw `postMessage({ type: 'stateSync', state: this.currentState })` calls with `this.postStateSync()`.
   - Added `case 'viewAnalysis':` to `handleWebviewMessage` delegating to `executeCommand`.

3. **Webview update** (`IdleView.tsx`, `ReviewPanel.tsx`, `package.json`):
   - `IdleView` extended with `hasAnalysis?` and `onViewAnalysis?` props; renders a secondary-styled "View Last Analysis" button only when both are truthy.
   - `ReviewPanel.tsx` adds `hasAnalysis` state slot, extracts it from `stateSync` messages, passes it and the `viewAnalysis` postMessage handler to `IdleView`.
   - `package.json` contributes `easyReview.viewAnalysis` with title "View Last Analysis", category "Easy Review", icon `$(book)`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2864f309 | feat(quick-260403-no8): extend message protocol |
| 2 | b29e2d7c | feat(quick-260403-no8): wire command and panel handler |
| 3 | c7f24558 | feat(quick-260403-no8): add View Last Analysis button and package.json entry |

## Deviations from Plan

None — plan executed exactly as written. The plan's activation.ts snippet had a redundant unused `uri` variable (declared but immediately shadowed); that was silently omitted in the implementation to keep the code clean.

## Known Stubs

None. The command fully wires to `StorageAdapter.getProjectAnalysis()` and renders live data.

## Self-Check: PASSED

- `src/shared/types.ts` modified with both new fields: confirmed
- `src/easy-review/activation.ts` contains `easyReview.viewAnalysis`: confirmed (line 279)
- `src/easy-review/panel/ReviewPanel.ts` contains `postStateSync` and `hasAnalysis`: confirmed (lines 244, 249)
- `src/webview/IdleView.tsx` contains `onViewAnalysis`: confirmed
- `src/webview/ReviewPanel.tsx` contains `viewAnalysis` and `hasAnalysis` wiring: confirmed (lines 23, 31, 85, 86)
- `package.json` valid JSON with `easyReview.viewAnalysis` entry: confirmed
- Commits 2864f309, b29e2d7c, c7f24558 present in git log: confirmed
