---
phase: 07-changes-tree-file-icons-and-pr-author
plan: 01
subsystem: ui
tags: [vscode, tree-view, icons, theme-icon, vitest, tdd]

requires:
  - phase: 02.1-in-editor-pr-navigation
    provides: FileNode class in EasyReviewTreeNodes.ts used as the modification target

provides:
  - FileNode.iconPath now uses vscode.ThemeIcon.File for file-type icons from active VS Code icon theme
  - vscode mock ThemeIcon.File and ThemeIcon.Folder static properties for test use
  - TDD test coverage for FileNode icon behavior across all file statuses

affects:
  - 07-02 (PR author display — uses same EasyReviewTreeNodes.ts file)

tech-stack:
  added: []
  patterns:
    - "Use vscode.ThemeIcon.File static for file-type icons — VS Code derives language icon from resourceUri.path extension"
    - "vscode mock static properties added via post-declaration assignment for class expressions"

key-files:
  created: []
  modified:
    - src/easy-review/providers/EasyReviewTreeNodes.ts
    - src/test/__mocks__/vscode.ts
    - src/easy-review/providers/easyReviewTreeNode.test.ts

key-decisions:
  - "ThemeIcon.File replaces status-specific ThemeIcons: VS Code derives file-type icon from resourceUri.path extension using active icon theme"
  - "FILE_STATUS_ICON constant removed as dead code after ThemeIcon.File adoption"
  - "vscode mock uses post-declaration assignment pattern for ThemeIcon static properties (class expression hoisting limitation)"

patterns-established:
  - "TDD pattern: write failing tests (RED), then implement (GREEN) — each phase committed separately"

requirements-completed: [TREE-01]

duration: 5min
completed: 2026-04-04
---

# Phase 7 Plan 01: Changes Tree File-Type Icons Summary

**FileNode diff-status icons replaced with `vscode.ThemeIcon.File`, enabling file-type icons from the active VS Code icon theme while label color decorations preserve change status**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T17:29:00Z
- **Completed:** 2026-04-04T17:30:17Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments

- `FileNode.iconPath` now assigns `vscode.ThemeIcon.File` — VS Code uses `resourceUri.path` extension to pick the correct language icon from the active icon theme (TypeScript, JSON, CSS, etc.)
- Dead code removed: `FILE_STATUS_ICON` map (7 codicon string entries for diff-added/modified/removed/renamed) no longer needed
- `resourceUri` assignment unchanged — label color decorations (green/orange/red for added/modified/removed) still work via `FileChange://` scheme
- vscode mock updated with `ThemeIcon.File` and `ThemeIcon.Folder` static properties using post-declaration assignment pattern
- 5 new tests added covering all file statuses (added, modified, removed, renamed) and resourceUri scheme verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Update vscode mock and add FileNode icon tests (RED)** - `941dc593` (test)
2. **Task 2: Replace FileNode iconPath with ThemeIcon.File and clean up dead code (GREEN)** - `a660df8f` (feat)

**Plan metadata:** (docs commit to follow)

_TDD: RED commit at 941dc593, GREEN commit at a660df8f_

## Files Created/Modified

- `src/easy-review/providers/EasyReviewTreeNodes.ts` — Replaced `new vscode.ThemeIcon(FILE_STATUS_ICON[...])` with `vscode.ThemeIcon.File`; removed `FILE_STATUS_ICON` constant
- `src/test/__mocks__/vscode.ts` — Added `static File` and `static Folder` properties to `ThemeIcon` class mock
- `src/easy-review/providers/easyReviewTreeNode.test.ts` — Added `import * as vscode from 'vscode'` and new `describe('FileNode — file-type icons (TREE-01, D-01/D-02/D-03)')` block with 5 tests

## Decisions Made

- Used `vscode.ThemeIcon.File` static (not `new vscode.ThemeIcon('file')`) — the static is the correct upstream pattern and enables object reference equality assertions in tests (upstream `fileChangeNode.ts:111` uses the same pattern)
- Post-declaration assignment pattern chosen for vscode mock static properties: `ThemeIcon.File = new ThemeIcon('file')` after class declaration — avoids self-referencing issues with class expression static initializers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing test failures in `sqlite.test.ts` (better-sqlite3 ABI mismatch) and `review-runner.test.ts` (CodexAdapter) are unrelated environment issues, not caused by these changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 07-01 complete: FileNode now shows file-type icons from the active VS Code icon theme
- `EasyReviewTreeNodes.ts` is ready for Plan 07-02 (PR author avatar display on PRTreeItem)
- All 34 tests in `easyReviewTreeNode.test.ts` pass; full suite unchanged from pre-existing baseline

---
*Phase: 07-changes-tree-file-icons-and-pr-author*
*Completed: 2026-04-04*
