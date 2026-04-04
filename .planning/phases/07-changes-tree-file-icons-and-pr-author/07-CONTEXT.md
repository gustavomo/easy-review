# Phase 7: Changes Tree — File Icons and PR Author - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Two visual upgrades to the sidebar changes tree:

1. **File-type icons on changed files** — `FileNode` items currently show `diff-added/diff-modified/diff-removed` ThemeIcons. Replace with file-type icons driven by the active VS Code file icon theme (TypeScript, JSON, CSS, etc.) so the file's language/type is immediately recognizable.

2. **PR author avatar on PR items** — `PRTreeItem` already shows `@author` as description text (Phase 2.2). This phase upgrades the PR item icon from the current state-colored codicon (git-pull-request) to the author's GitHub avatar image, with the state indicator moving to the description field.

No new commands, no new webviews, no review generation changes.

</domain>

<decisions>
## Implementation Decisions

### File-type icons on FileNode
- **D-01:** Replace the current `iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status])` in `FileNode` with file-type icons sourced from the active VS Code file icon theme. The icon must reflect the file's language/type (e.g., `.ts` → TypeScript icon, `.json` → JSON icon, `.css` → CSS icon) — not a generic file icon.
- **D-02:** The `diff-added / diff-removed / diff-modified / diff-renamed` ThemeIcons are removed from `FileNode`. File change status continues to be conveyed by label color decoration (the existing git decoration mechanism via `resourceUri`). No separate status text or symbol is added — label color alone is sufficient.
- **D-03:** The `resourceUri` on `FileNode` currently uses the `FileChange://` custom scheme (via `toResourceUri`) to drive git decoration colors on the label. The researcher must determine whether to: (a) use `vscode.Uri.file(filename)` for both icon-theme lookup and color, or (b) keep the `FileChange://` URI for colors and add a separate mechanism for the file-type icon. Decision outcome must preserve label coloring.

### PR author avatar on PRTreeItem
- **D-04:** Replace `PRTreeItem`'s current `iconPath = new vscode.ThemeIcon(icon.id, icon.color)` (state-colored codicon) with the author's GitHub avatar image. Set `iconPath` to `vscode.Uri.parse(avatarUrl)` — VS Code renders HTTPS URIs as image icons in tree items.
- **D-05:** Avatar URL source: `StoredPR.raw` (full GitHub API JSON). Field path is `user.avatar_url` on the GitHub PR object (top-level `user` field, not nested). No extra API call needed — `raw` is already stored in SQLite from Phase 1.
- **D-06:** Fallback: if `user.avatar_url` is absent in `raw`, null, or empty string — fall back to the current state icon (`git-pull-request` / `git-merge` / `git-pull-request-closed` with ThemeColor). Never show a broken/missing image.

### PR item description layout
- **D-07:** The PR state indicator moves from `iconPath` (where it was the colored codicon) to the `description` field. New description format: `{state} · @{author}` — e.g., `open · @gustavo`, `merged · @alice`. The `●` bullet or similar separator is Claude's Discretion (keep it minimal).
- **D-08:** The `@author` text that Phase 2.2 added stays — it is now part of the combined `description` string alongside the state. The existing `this.description = \`@${pr.author}\`` is replaced with the combined format.

### Claude's Discretion
- Exact Unicode separator character between state and author in description (`·`, `•`, `-`, or none)
- Whether to append `?s=40` (or similar) to the GitHub avatar URL to request a smaller image — reduces bandwidth, VS Code will scale it
- Whether `DirectoryNode` icons (currently `new vscode.ThemeIcon('folder')`) should remain unchanged — they are not in scope for file-type icons
- Exact approach for preserving FileNode label colors while switching icon source (implementation detail for researcher to resolve)

</decisions>

<specifics>
## Specific Ideas

- File-type icons should match the active file icon theme (the same icons the user sees in the VS Code file explorer). This is the "built-in icon theme" the user referred to — not hardcoded icons.
- The PR overview already shows full PR details (title, author, state, dates, etc.) — the tree item enhancement is purely for at-a-glance recognition.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files being modified
- `src/easy-review/providers/EasyReviewTreeNodes.ts` — `FileNode` class: current `iconPath` and `resourceUri` implementation to replace
- `src/easy-review/providers/PRTreeItem.ts` — `PRTreeItem` class: current `iconPath` (state icon) and `description` (`@author`) to upgrade

### Resource URI and decoration mechanism
- `src/common/uri.ts` function `toResourceUri` (line ~437) — creates `FileChange://` scheme URIs for git decoration colors; researcher must understand this before changing `resourceUri` on `FileNode`
- `src/easy-review/storage/types.ts` — `StoredPR` type: confirm `raw` field type and `user.avatar_url` field availability

### Prior phase decisions (context)
- `.planning/phases/02.1-in-editor-pr-navigation/02.1-CONTEXT.md` — D-01 (folder tree structure), D-02 (file status icons, diff editor title), D-05 (loading ThemeIcon)
- `.planning/phases/02.2-sidebar-ui-enhancements/02.2-CONTEXT.md` — D-01 (contextValue hasReview), the `@author` description (Phase 2.2 already sets `this.description = \`@${pr.author}\``)

### No external specs
No ADRs or design docs for this phase — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Files being changed
- `src/easy-review/providers/EasyReviewTreeNodes.ts:59–89` — `FileNode`: sets `iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status])` and `resourceUri = toResourceUri(vscode.Uri.file(file.filename), ...)` with `FileChange://` scheme
- `src/easy-review/providers/PRTreeItem.ts:8–28` — `PRTreeItem`: `STATE_ICON` map with codicon IDs + ThemeColors; `this.iconPath = new vscode.ThemeIcon(icon.id, icon.color)`; `this.description = \`@${pr.author}\``

### What already works (do not redo)
- `@author` in description: already in PRTreeItem line 27 — only needs to be combined with state text (D-07, D-08), not added from scratch
- `contextValue` with `hasReview` suffix: must be preserved as-is (Phase 2.2 menus depend on it)
- `DirectoryNode` folder icon (`new vscode.ThemeIcon('folder')`): not in scope — leave unchanged
- `LoadingNode` and `ErrorNode` icons: not in scope — leave unchanged

### Integration points
- `EasyReviewTreeNodes.ts` is self-contained — changes to `FileNode` and `PRTreeItem` do not affect `EasyReviewPRsProvider` logic
- Tests: `easyReviewTreeNode.test.ts` will need updating for new `FileNode` icon behavior

</code_context>

<deferred>
## Deferred Ideas

- File diff stats (+N/-M) next to file names in the tree — nice-to-have, add to backlog
- Showing commit count or review comment count on PR items — separate enhancement
- Caching avatar images locally to avoid repeated HTTP requests — optimization, not needed for v1

</deferred>

---

*Phase: 07-changes-tree-file-icons-and-pr-author*
*Context gathered: 2026-04-04*
