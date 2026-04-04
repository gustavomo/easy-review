---
phase: 07-changes-tree-file-icons-and-pr-author
plan: 02
subsystem: ui
tags: [vscode, tree-view, icons, avatar, github-api, vitest, tdd]

requires:
  - phase: 02.1-in-editor-pr-navigation
    provides: PRTreeItem class used as modification target
  - phase: 07-01
    provides: easyReviewTreeNode.test.ts TDD infrastructure and vscode mock patterns

provides:
  - PRTreeItem.iconPath uses vscode.Uri.parse(avatarUrl) when StoredPR.raw contains user.avatar_url
  - PRTreeItem.iconPath falls back to state-colored ThemeIcon (git-pull-request/git-merge/git-pull-request-closed) when avatar missing or invalid
  - PRTreeItem.description shows "{state} · @{author}" format with middle dot separator (U+00B7)
  - getAvatarUrl() helper function for safe JSON.parse extraction of user.avatar_url from StoredPR.raw

affects:
  - Any future plan modifying PRTreeItem constructor

tech-stack:
  added: []
  patterns:
    - "Avatar URL extracted from StoredPR.raw via safe JSON.parse with try/catch — no throw on invalid JSON"
    - "GitHub CDN size param pattern: append ?s=40 or &s=40 depending on existing query string"
    - "Fallback pattern: check truthy URL, use vscode.Uri.parse() for image iconPath, else ThemeIcon for codicon"

key-files:
  created: []
  modified:
    - src/easy-review/providers/PRTreeItem.ts
    - src/easy-review/providers/easyReviewTreeNode.test.ts

key-decisions:
  - "getAvatarUrl() uses try/catch around JSON.parse — invalid raw field returns undefined without throwing (D-06)"
  - "Avatar URL gets ?s=40 or &s=40 appended based on presence of existing query string — prevents double-? URL malformation"
  - "Description format is '{state} · @{author}' using U+00B7 middle dot as separator per UI-SPEC copywriting contract"
  - "STATE_ICON map retained as fallback — not dead code despite avatar path being primary"

patterns-established:
  - "TDD pattern: write failing tests (RED), then implement (GREEN) — each phase committed separately"

requirements-completed: [TREE-02, TREE-03]

duration: 5min
completed: 2026-04-04
---

# Phase 7 Plan 02: PR Author Avatar Display Summary

**PRTreeItem now shows GitHub avatar as iconPath (vscode.Uri) with state-colored codicon fallback, and description combines state + author as "{state} · @{author}" using middle dot separator**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T17:32:00Z
- **Completed:** 2026-04-04T17:35:00Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- `PRTreeItem.iconPath` now uses `vscode.Uri.parse(avatarUrl + '?s=40')` when `StoredPR.raw` contains a valid `user.avatar_url` — VS Code renders the GitHub avatar image directly in the sidebar tree
- Safe fallback to state-colored `ThemeIcon` (`git-pull-request` / `git-merge` / `git-pull-request-closed`) when avatar is missing, raw is invalid JSON, or avatar_url is empty string
- `PRTreeItem.description` changed from `@{author}` to `{state} · @{author}` — state moves from icon semantics to visible text, combined with author in one description field
- `getAvatarUrl()` helper extracts `user.avatar_url` from raw GitHub API JSON with full error isolation (try/catch, undefined return)
- 10 new tests covering all avatar/description behaviors; all 44 tests pass after implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PRTreeItem avatar and description tests (RED)** - `8b35df9b` (test)
2. **Task 2: Update PRTreeItem with avatar iconPath and combined description (GREEN)** - `e946acea` (feat)

**Plan metadata:** (docs commit to follow)

_TDD: RED commit at 8b35df9b, GREEN commit at e946acea_

## Files Created/Modified

- `src/easy-review/providers/PRTreeItem.ts` — Added `getAvatarUrl()` helper; constructor now uses `vscode.Uri.parse(sized)` for avatar or falls back to `new vscode.ThemeIcon(icon.id, icon.color)`; description changed to `${pr.state} \u00b7 @${pr.author}`
- `src/easy-review/providers/easyReviewTreeNode.test.ts` — Added `describe('PRTreeItem — avatar icon and combined description (TREE-02, TREE-03)')` block with 10 tests

## Decisions Made

- `getAvatarUrl()` wraps JSON.parse in try/catch — invalid `raw` field returns `undefined` without throwing, ensuring no runtime errors in tree rendering
- Size parameter logic checks for existing `?` to append `&s=40` vs `?s=40` — prevents URL malformation (e.g., `https://avatars.github.com/u/123?v=4&s=40` not `?v=4?s=40`)
- `STATE_ICON` map retained — it serves the fallback path and is not dead code
- Middle dot U+00B7 used as separator per UI-SPEC copywriting contract (not dash, not slash)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing test failures in `sqlite.test.ts` (better-sqlite3 ABI mismatch) and `review-runner.test.ts` (CodexAdapter) are unrelated environment issues, not caused by these changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 07 complete: all 2 plans done (file-type icons + PR author avatar)
- `PRTreeItem` now shows author avatar with fallback codicon and combined state+author description
- All 44 tests in `easyReviewTreeNode.test.ts` pass; pre-existing test failures are environment-level ABI issues unrelated to this work

---
*Phase: 07-changes-tree-file-icons-and-pr-author*
*Completed: 2026-04-04*
