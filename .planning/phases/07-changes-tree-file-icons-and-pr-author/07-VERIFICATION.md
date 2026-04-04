---
phase: 07-changes-tree-file-icons-and-pr-author
verified: 2026-04-04T12:36:00Z
status: human_needed
score: 3/3 must-haves verified
human_verification:
  - test: "Open VS Code Extension Development Host with the extension loaded. In the Easy Review sidebar, add a PR that has changed files. Expand the PR to see the file list. Verify that each changed file shows a file-type icon matching the active VS Code icon theme (e.g., TypeScript .ts files show the TS icon, JSON files show the JSON icon) rather than a generic diff codicon."
    expected: "Each file in the changes tree shows a language-specific icon from the active icon theme. Label text color still shows green (added), red (removed), or orange (modified) from git decorations."
    why_human: "vscode.ThemeIcon.File icon resolution from resourceUri.path extension is performed at runtime by VS Code's icon theme engine — cannot be verified by static code analysis or unit tests."
  - test: "In the same sidebar, inspect each PR tree item. For a PR stored with a valid GitHub API payload in its raw field, verify the avatar image of the PR author is shown as the tree item icon. For a PR with no avatar data, verify the state-colored codicon fallback (green circle for open, purple merge for merged, red for closed) is shown."
    expected: "PR items with avatar data show a circular avatar image. PR items without valid raw data show the state-colored codicon."
    why_human: "vscode.Uri as iconPath for network image loading is a VS Code runtime behavior — cannot be verified in unit tests."
  - test: "Verify that each PR tree item description shows the format: '{state} · @{author}' — for example 'open · @alice'. The separator must be the middle dot character (·, U+00B7), not a hyphen or slash."
    expected: "All PR items display combined state and author in description using middle dot separator."
    why_human: "VS Code renders the description field in a distinct font/color next to the label in the tree — visual rendering can only be confirmed in the live Extension Development Host."
---

# Phase 7: Changes Tree — File Icons and PR Author Verification Report

**Phase Goal:** Improve the sidebar changes tree with two visual upgrades: (1) show the VS Code file-type icon next to each changed file using the active icon theme (`vscode.ThemeIcon.File` + `resourceUri`), and (2) display the PR creator's GitHub avatar on each PR tree item with state text in the description field.
**Verified:** 2026-04-04T12:36:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | FileNode shows file-type icon from active VS Code icon theme | ? HUMAN | `this.iconPath = vscode.ThemeIcon.File` at EasyReviewTreeNodes.ts:61. Label color decorations preserved via resourceUri/toResourceUri (lines 64-71). Static resolution verified by test at line 277: `expect(node.iconPath).toBe(vscode.ThemeIcon.File)`. Runtime icon rendering needs human. |
| 2 | PR tree item shows author's GitHub avatar when available, falls back to state codicon | ? HUMAN | `getAvatarUrl()` + `vscode.Uri.parse(sized)` at PRTreeItem.ts:39-43. Fallback to `STATE_ICON` ThemeIcon at lines 46-47. Covered by 6 tests in easyReviewTreeNode.test.ts. Visual rendering needs human. |
| 3 | PR tree item description shows "{state} · @{author}" with middle dot separator | ? HUMAN | `this.description = \`${pr.state} \u00b7 @${pr.author}\`` at PRTreeItem.ts:49. Covered by 3 tests asserting exact string with U+00B7. VS Code text rendering needs human. |

**Score:** 3/3 truths — all verified programmatically; visual rendering items routed to human.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/easy-review/providers/EasyReviewTreeNodes.ts` | FileNode with ThemeIcon.File iconPath | VERIFIED | `this.iconPath = vscode.ThemeIcon.File` at line 61; `FILE_STATUS_ICON` constant absent (removed as dead code); `STATUS_TO_GIT_CHANGE_TYPE` retained; `toResourceUri` wiring intact. |
| `src/test/__mocks__/vscode.ts` | ThemeIcon.File and ThemeIcon.Folder statics | VERIFIED | Lines 55-60: `static File: InstanceType<typeof ThemeIcon>` and post-declaration `ThemeIcon.File = new ThemeIcon('file')`. |
| `src/easy-review/providers/PRTreeItem.ts` | Avatar iconPath + combined description | VERIFIED | `getAvatarUrl()` helper (lines 19-27); `vscode.Uri.parse(sized)` with `?s=40` or `&s=40` (lines 40-43); `STATE_ICON` fallback retained (lines 46-47); description at line 49. |
| `src/easy-review/providers/easyReviewTreeNode.test.ts` | Tests for all three truths | VERIFIED | 44 tests total pass. `describe('FileNode — file-type icons (TREE-01, D-01/D-02/D-03)')` has 6 tests (lines 248-291). `describe('PRTreeItem — avatar icon and combined description (TREE-02, TREE-03)')` has 10 tests (lines 293-360). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| EasyReviewTreeNodes.ts | vscode.ThemeIcon.File | `this.iconPath = vscode.ThemeIcon.File` in FileNode constructor | WIRED | Line 61 confirmed by grep and test assertion (object reference equality). |
| EasyReviewTreeNodes.ts | toResourceUri | `this.resourceUri = toResourceUri(...)` in FileNode constructor | WIRED | Lines 65-71 confirmed; resourceUri is set and scheme is not 'file' (verified by test at line 284-290). |
| PRTreeItem.ts | StoredPR.raw | `JSON.parse(pr.raw)` in `getAvatarUrl()` | WIRED | Lines 20-23; wrapped in try/catch for safe extraction. |
| PRTreeItem.ts | vscode.Uri.parse | `this.iconPath = vscode.Uri.parse(sized)` | WIRED | Line 43; `?s=40` or `&s=40` query param logic at line 42. |

### Data-Flow Trace (Level 4)

These artifacts render data from `StoredPR` (a database-backed model already verified in prior phases). No new data sources introduced in this phase.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| FileNode | `file.filename` (resourceUri extension) | `PRFileChange.filename` passed to constructor | Yes — comes from GitHub API via PRFileFetcher (Phase 2.1) | FLOWING |
| PRTreeItem | `pr.raw` (avatar_url extraction) | `StoredPR.raw` from SQLite | Yes — stored GitHub API JSON; `getAvatarUrl()` safely extracts `user.avatar_url` | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| easyReviewTreeNode.test.ts — all 44 tests pass | `npx vitest run src/easy-review/providers/easyReviewTreeNode.test.ts` | 44 passed (0 failed) | PASS |
| Full test suite — no regressions from phase 07 files | `npx vitest run` (all files) | 152 passed, 20 failed — all failures are pre-existing (sqlite ABI mismatch, CodexAdapter, mermaidValidation, modelSettings — confirmed pre-existing per SUMMARY) | PASS (phase 07 contributes 0 new failures) |
| `FILE_STATUS_ICON` removed (dead code cleanup) | `grep FILE_STATUS_ICON EasyReviewTreeNodes.ts` | No matches | PASS |
| `STATUS_TO_GIT_CHANGE_TYPE` retained (label colors) | `grep STATUS_TO_GIT_CHANGE_TYPE EasyReviewTreeNodes.ts` | 3 matches (definition + 2 usages) | PASS |
| ThemeIcon statics exist in vscode mock | `grep "ThemeIcon.File" src/test/__mocks__/vscode.ts` | Lines 55, 59 confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TREE-01 | 07-01-PLAN.md | FileNode shows file-type icon from active VS Code icon theme | SATISFIED | `this.iconPath = vscode.ThemeIcon.File` at EasyReviewTreeNodes.ts:61; 5 passing tests assert `id === 'file'` for all file statuses |
| TREE-02 | 07-02-PLAN.md | PRTreeItem shows author GitHub avatar as iconPath | SATISFIED | `vscode.Uri.parse(sized)` at PRTreeItem.ts:43; fallback to STATE_ICON ThemeIcon; 6 passing tests cover avatar path + fallback paths |
| TREE-03 | 07-02-PLAN.md | PRTreeItem description shows "{state} · @{author}" | SATISFIED | `\`${pr.state} \u00b7 @${pr.author}\`` at PRTreeItem.ts:49; 3 passing tests assert exact format with U+00B7 for open/merged/closed states |

**IMPORTANT — Orphaned Requirement IDs:** TREE-01, TREE-02, and TREE-03 are referenced in the PLAN frontmatter and ROADMAP but do NOT appear in `.planning/REQUIREMENTS.md`. They are defined nowhere in the requirements document. The traceability table in REQUIREMENTS.md ends at GH-02 with no TREE-* entries. This is a documentation gap — the requirements exist only implicitly in the ROADMAP phase details. The implementations satisfy the behaviors described in the PLANs; the gap is that REQUIREMENTS.md was not updated to formally define these IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

All stub patterns checked:
- No `TODO/FIXME/PLACEHOLDER` comments in modified files.
- No `return null` / `return []` / empty implementations in the new logic.
- `getAvatarUrl()` returns `undefined` (not empty data) on failure — correct behavior, not a stub.
- `STATE_ICON` fallback is intentional — not dead code, serves the no-avatar path.
- Pre-existing test failures (sqlite ABI, CodexAdapter, mermaidValidation, modelSettings) are environment-level issues documented as pre-existing in both SUMMARY files — not caused by phase 07 changes.

### Human Verification Required

#### 1. File-type icons in changes tree

**Test:** Open the Extension Development Host (`F5` from the repo). In the Easy Review sidebar, add a PR with TypeScript and JSON changed files. Expand the PR tree item. Inspect the icon shown for each file.
**Expected:** TypeScript files show the TS language icon; JSON files show the JSON icon; CSS files show the CSS icon — matching whatever VS Code icon theme is active (e.g., Material Icon Theme). Label text uses color decorations: green for added, red for removed, orange for modified.
**Why human:** `vscode.ThemeIcon.File` resolution against `resourceUri.path` extension is performed at runtime by VS Code's icon theme renderer — this is a VS Code platform behavior that unit tests cannot exercise.

#### 2. PR author avatar display

**Test:** In the Easy Review sidebar, view PR tree items. For a PR that was fetched from GitHub (has a full API response in its raw field), verify the avatar image is shown. For a manually-added PR with no raw data or `{}`, verify the state-colored codicon fallback appears.
**Expected:** PRs with avatar data show a circular 40px avatar image. PRs without valid raw show the color-coded codicon: green `git-pull-request` for open, purple `git-merge` for merged, red `git-pull-request-closed` for closed.
**Why human:** `vscode.Uri` as `iconPath` causes VS Code to fetch and render a remote image — this network fetch and rendering cannot be confirmed without a live VS Code instance.

#### 3. Description format in tree

**Test:** Inspect the description text next to each PR label in the sidebar.
**Expected:** Each PR shows text in the format `open · @alice` (or merged/closed with the author's login). The separator is a middle dot (·), not a hyphen or slash.
**Why human:** VS Code renders the `description` property in a secondary color to the right of the label — visual confirmation requires the live Extension Development Host.

### Gaps Summary

No implementation gaps found. All three observable truths are implemented, substantive, wired, and data-flowing. The only unresolved items are visual rendering behaviors that require the Extension Development Host (routed to human verification above).

One documentation gap exists: TREE-01, TREE-02, and TREE-03 requirement IDs are not defined in `.planning/REQUIREMENTS.md`. They appear only in PLAN frontmatter and ROADMAP. This does not block the phase goal but should be addressed to keep requirements traceable.

---

_Verified: 2026-04-04T12:36:00Z_
_Verifier: Claude (gsd-verifier)_
