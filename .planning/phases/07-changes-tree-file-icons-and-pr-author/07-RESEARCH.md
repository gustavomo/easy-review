# Phase 7: Changes Tree Enhancements — File Icons and PR Author - Research

**Researched:** 2026-04-04
**Domain:** VS Code TreeItem iconPath, ThemeIcon, FileDecorationProvider, GitHub avatar rendering
**Confidence:** HIGH

## Summary

This phase makes two visual changes to the easy-review sidebar tree: (1) replace diff-status ThemeIcons on `FileNode` with file-type icons from the active VS Code icon theme, and (2) replace the state codicon on `PRTreeItem` with the PR author's GitHub avatar image.

The file-type icon implementation follows a well-documented pattern already used by the upstream fork: set `iconPath = vscode.ThemeIcon.File` and VS Code derives the icon from the active file icon theme using the `resourceUri` path. The critical subtlety is that our `FileNode.resourceUri` currently uses the `filechange://` scheme (via `toResourceUri`), but VS Code's icon resolution works by matching the file extension from the URI path component regardless of scheme -- the upstream does the same (different scheme, same path). The existing `FileTypeDecorationProvider` from the upstream (registered globally) already provides color/badge decorations by reading query params from the URI, so label coloring will be preserved.

The avatar implementation is straightforward: VS Code renders HTTPS URIs as image icons when set as `iconPath` on TreeItems. The `StoredPR.raw` field (JSON string of the full GitHub API response) contains `user.avatar_url`. A fallback to the current state ThemeIcon is needed when the avatar URL is missing.

**Primary recommendation:** Set `FileNode.iconPath = vscode.ThemeIcon.File` (one-line change) and keep the existing `resourceUri` as-is. For `PRTreeItem`, parse `pr.raw` to extract `user.avatar_url` and set `iconPath = vscode.Uri.parse(avatarUrl)` with state-icon fallback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace `iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status])` in `FileNode` with file-type icons from the active VS Code file icon theme, reflecting the file's language/type.
- **D-02:** Remove diff-added/removed/modified/renamed ThemeIcons from FileNode. File change status conveyed by label color decoration via `resourceUri` only.
- **D-03:** Researcher must determine whether to use `vscode.Uri.file(filename)` for both icon-theme lookup and color, or keep the `FileChange://` URI for colors and add a separate mechanism for file-type icon. Must preserve label coloring.
- **D-04:** Replace `PRTreeItem` iconPath with author's GitHub avatar image via `vscode.Uri.parse(avatarUrl)`.
- **D-05:** Avatar URL sourced from `StoredPR.raw` field, path `user.avatar_url`. No extra API call.
- **D-06:** Fallback to state icon (git-pull-request/git-merge/git-pull-request-closed with ThemeColor) when avatar URL is absent/null/empty.
- **D-07:** PR state moves from iconPath to description. Format: `{state} . @{author}`.
- **D-08:** Replace existing `this.description = \`@${pr.author}\`` with combined state+author format.

### Claude's Discretion
- Exact Unicode separator character between state and author in description
- Whether to append `?s=40` to GitHub avatar URL for smaller image
- Whether DirectoryNode icons remain unchanged (not in scope)
- Exact approach for preserving FileNode label colors while switching icon source

### Deferred Ideas (OUT OF SCOPE)
- File diff stats (+N/-M) next to file names
- Commit count or review comment count on PR items
- Caching avatar images locally
</user_constraints>

## Standard Stack

No new dependencies. This phase modifies only two existing files using built-in VS Code APIs.

### Core APIs Used
| API | Purpose | Documentation |
|-----|---------|---------------|
| `vscode.ThemeIcon.File` | Static ThemeIcon that tells VS Code to derive file-type icon from active icon theme + resourceUri | VS Code API `TreeItem.iconPath` docs |
| `vscode.Uri.parse()` | Parse HTTPS avatar URL into a Uri for `iconPath` image rendering | VS Code API `Uri` |
| `vscode.ThemeIcon` constructor | Fallback state icons (git-pull-request, git-merge, git-pull-request-closed) | Already in use |
| `TreeItem.resourceUri` | Drives both icon-theme file type resolution AND FileDecoration (color/badge) | VS Code API `TreeItem.resourceUri` |

## Architecture Patterns

### Pattern 1: File-Type Icon via ThemeIcon.File + resourceUri

**What:** VS Code's `TreeItem` resolves file-type icons from the active icon theme when `iconPath` is set to `vscode.ThemeIcon.File` and a `resourceUri` is present. The icon is determined by the file extension in `resourceUri.path`.

**When to use:** Any TreeItem representing a file where you want the icon to match the user's active file icon theme (e.g., Seti, Material Icon Theme).

**How the upstream does it (verified in `src/view/treeNodes/fileChangeNode.ts:111`):**
```typescript
// Upstream GitFileChangeNode constructor
this.iconPath = vscode.ThemeIcon.File;
this.fileChangeResourceUri = toResourceUri(
  vscode.Uri.file(this.changeModel.fileName),
  this.pullRequest.number,
  this.changeModel.fileName,
  this.changeModel.status,
  previousFileName
);
// resourceUri getter returns file-scheme URI with filechange query params
get resourceUri(): vscode.Uri {
  return this.changeModel.filePath.with({ query: this.fileChangeResourceUri.query });
}
```

**Key insight from VS Code API docs (`@types/vscode.d.ts:12311-12328`):**
> When a file or folder ThemeIcon is specified, icon is derived from the current file icon theme for the specified theme icon using `resourceUri` (if provided).

The icon resolution uses the **path component** of `resourceUri` (specifically the file extension) -- NOT the scheme. The scheme is used by `FileDecorationProvider` for color/badge lookup.

### Pattern 2: D-03 Resolution -- Keep Existing resourceUri, Just Change iconPath

**Decision:** Keep the existing `FileChange://` scheme `resourceUri` exactly as-is. Only change `iconPath` from `new vscode.ThemeIcon(FILE_STATUS_ICON[...])` to `vscode.ThemeIcon.File`.

**Why this works:**
1. `vscode.ThemeIcon.File` triggers icon-theme lookup using `resourceUri.path` -- the path already contains the filename with extension (e.g., `/src/foo.ts`)
2. The `FileChange://` scheme + query params continue to be read by the upstream's `FileTypeDecorationProvider` (registered globally in `extension.ts:185`) which provides color/badge decorations
3. This is effectively what the upstream does, except the upstream uses `file://` scheme -- but the icon resolver only cares about the path/extension

**What changes in `FileNode` constructor:**
```typescript
// BEFORE (line 72):
this.iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status] ?? 'diff-modified');

// AFTER:
this.iconPath = vscode.ThemeIcon.File;
```

**What stays the same:** The entire `resourceUri` assignment (lines 74-82) remains unchanged. The `FILE_STATUS_ICON` and `STATUS_TO_GIT_CHANGE_TYPE` maps can be cleaned up (FILE_STATUS_ICON becomes unused; STATUS_TO_GIT_CHANGE_TYPE is still needed for resourceUri).

### Pattern 3: HTTPS URI as TreeItem Icon (Avatar)

**What:** VS Code renders HTTPS URIs as image icons when assigned to `TreeItem.iconPath`. The image is fetched and displayed inline in the tree.

**Example:**
```typescript
// Set iconPath to an HTTPS URI — VS Code fetches and renders the image
this.iconPath = vscode.Uri.parse('https://avatars.githubusercontent.com/u/12345?v=4&s=40');
```

**Important:** `iconPath` can be a `Uri`, `{ light: Uri, dark: Uri }`, or `ThemeIcon`. An HTTPS `Uri` works for both light and dark themes because it's a raster image.

### Pattern 4: Parsing avatar_url from StoredPR.raw

**What:** `StoredPR.raw` is `JSON.stringify` of the full GitHub API PR response. The avatar URL lives at `user.avatar_url`.

**Safe extraction pattern:**
```typescript
function getAvatarUrl(pr: StoredPR): string | undefined {
  try {
    const raw = JSON.parse(pr.raw);
    const url = raw?.user?.avatar_url;
    return typeof url === 'string' && url.length > 0 ? url : undefined;
  } catch {
    return undefined;
  }
}
```

### Anti-Patterns to Avoid
- **Do NOT use `vscode.Uri.file(filename)` for resourceUri to get file icons** -- this would break the label color decorations that depend on the `FileChange://` scheme and query params. The existing `toResourceUri` call must stay.
- **Do NOT hardcode file extension to icon mappings** -- `ThemeIcon.File` delegates to the user's active icon theme, which is the correct approach.
- **Do NOT store/cache avatar images to disk** -- VS Code handles HTTP URI icon fetching and caching internally. Deferred per CONTEXT.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File-type icon mapping | Extension-to-icon lookup table | `vscode.ThemeIcon.File` + `resourceUri` | VS Code handles 500+ file types via the active icon theme; any manual mapping is incomplete |
| Avatar image fetching | HTTP client + image caching | `vscode.Uri.parse(avatarUrl)` as `iconPath` | VS Code fetches and caches HTTP icon URIs internally |
| File change status colors | Custom CSS or inline coloring | Existing `FileTypeDecorationProvider` + `resourceUri` query params | Already working via upstream's decoration provider |

## Common Pitfalls

### Pitfall 1: ThemeIcon.File Not in vscode Mock
**What goes wrong:** Tests fail because the vitest mock at `src/test/__mocks__/vscode.ts` defines `ThemeIcon` as a class with constructor only -- no `static File` or `static Folder` properties.
**Why it happens:** The mock was written for Phase 1 when only `new ThemeIcon('icon-id')` was needed.
**How to avoid:** Add static properties to the mock:
```typescript
export const ThemeIcon = class {
  static File = new ThemeIcon('file');
  static Folder = new ThemeIcon('folder');
  constructor(public id: string, public color?: unknown) {}
};
```
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'File')` in test output.

### Pitfall 2: resourceUri Scheme Matters for Decorations, Not for Icons
**What goes wrong:** Changing `resourceUri` scheme to `file://` to "help" icon resolution breaks the label color decorations provided by `FileTypeDecorationProvider`.
**Why it happens:** Misunderstanding that icon resolution needs `file://` scheme. It doesn't -- it reads the path extension. But `FileTypeDecorationProvider.provideFileDecoration` reads query params from URIs and the decoration system routes by scheme.
**How to avoid:** Do NOT change `resourceUri`. Only change `iconPath`.

### Pitfall 3: JSON.parse Failure on StoredPR.raw
**What goes wrong:** `JSON.parse(pr.raw)` throws if `raw` is empty string, malformed, or `'{}'` (no `user` field).
**Why it happens:** Edge cases in stored data -- PRs added before `raw` was properly populated, or API responses with missing fields.
**How to avoid:** Wrap in try/catch, validate `user.avatar_url` is a non-empty string, fall back to state ThemeIcon.

### Pitfall 4: Avatar URL Without Size Parameter
**What goes wrong:** GitHub avatar URLs default to 460x460 pixels. VS Code tree icons are ~16x16. Fetching full-size avatars wastes bandwidth and may cause momentary layout shifts.
**Why it happens:** Not appending a size query parameter to the avatar URL.
**How to avoid:** Append `?s=40` (or `&s=40` if URL already has query params) to request a 40x40 image. GitHub's CDN supports this parameter.

### Pitfall 5: Empty Description String When State is Undefined
**What goes wrong:** If `pr.state` is somehow not one of the expected values, the description string becomes garbled.
**Why it happens:** TypeScript type says `'open' | 'closed' | 'merged'` but runtime data from SQLite could technically have other values.
**How to avoid:** The type system covers this. The existing `STATE_ICON` map already handles the three states. No extra guard needed beyond the existing pattern.

## Code Examples

### FileNode: Replace Status Icon with File-Type Icon
```typescript
// Source: Verified in upstream src/view/treeNodes/fileChangeNode.ts:111
// and VS Code API @types/vscode.d.ts:12311-12328

// In FileNode constructor, replace:
//   this.iconPath = new vscode.ThemeIcon(FILE_STATUS_ICON[file.status] ?? 'diff-modified');
// With:
this.iconPath = vscode.ThemeIcon.File;

// resourceUri stays EXACTLY as-is — it drives both icon theme lookup (via path)
// and label color decorations (via FileChange:// scheme + query params)
```

### PRTreeItem: Avatar Icon with State in Description
```typescript
// Source: VS Code API — TreeItem.iconPath accepts Uri for image rendering

// Helper to extract avatar URL safely
function getAvatarUrl(pr: StoredPR): string | undefined {
  try {
    const raw = JSON.parse(pr.raw);
    const url = raw?.user?.avatar_url;
    return typeof url === 'string' && url.length > 0 ? url : undefined;
  } catch {
    return undefined;
  }
}

// In PRTreeItem constructor:
const avatarUrl = getAvatarUrl(pr);
if (avatarUrl) {
  // Append size param for efficiency — GitHub CDN supports ?s=N
  const sized = avatarUrl.includes('?') ? `${avatarUrl}&s=40` : `${avatarUrl}?s=40`;
  this.iconPath = vscode.Uri.parse(sized);
} else {
  // Fallback to state-colored codicon (D-06)
  const icon = STATE_ICON[pr.state];
  this.iconPath = new vscode.ThemeIcon(icon.id, icon.color);
}

// Combined description: state + author (D-07, D-08)
this.description = `${pr.state} · @${pr.author}`;
```

### Updated vscode Mock for Tests
```typescript
// In src/test/__mocks__/vscode.ts — add static properties to ThemeIcon
export const ThemeIcon = class {
  static File = new ThemeIcon('file');
  static Folder = new ThemeIcon('folder');
  constructor(public id: string, public color?: unknown) {}
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual icon-per-file-type mapping | `ThemeIcon.File` + `resourceUri` | VS Code 1.x (long-standing) | One line replaces any manual mapping; respects user's chosen icon theme |
| Badge icons for PR state | Avatar image + state in description | This phase | Richer visual identity per PR at a glance |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest, per vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/easy-review/providers/easyReviewTreeNode.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | FileNode.iconPath is ThemeIcon.File | unit | `npx vitest run src/easy-review/providers/easyReviewTreeNode.test.ts` | Needs update |
| D-02 | FILE_STATUS_ICON no longer used for iconPath | unit | same | Needs update |
| D-03 | resourceUri unchanged (preserves label colors) | unit | same | Needs update |
| D-04 | PRTreeItem.iconPath is Uri when avatar available | unit | same | Needs new tests |
| D-05 | Avatar URL extracted from pr.raw user.avatar_url | unit | same | Needs new tests |
| D-06 | Fallback to state ThemeIcon when no avatar | unit | same | Needs new tests |
| D-07 | Description format: `{state} . @{author}` | unit | same | Needs update (existing test checks `@author`) |
| D-08 | Combined description replaces plain `@author` | unit | same | Needs update |

### Sampling Rate
- **Per task commit:** `npx vitest run src/easy-review/providers/easyReviewTreeNode.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/test/__mocks__/vscode.ts` -- Add `ThemeIcon.File` and `ThemeIcon.Folder` static properties
- [ ] `src/easy-review/providers/easyReviewTreeNode.test.ts` -- Add tests for new FileNode iconPath, PRTreeItem avatar, description format, fallback behavior

## Sources

### Primary (HIGH confidence)
- `src/@types/vscode.d.ts:12308-12328` -- Official VS Code API: TreeItem.iconPath + resourceUri interaction for icon theme resolution
- `src/view/treeNodes/fileChangeNode.ts:111` -- Upstream pattern: `ThemeIcon.File` with resourceUri for file-type icons
- `src/view/fileTypeDecorationProvider.ts` -- Upstream FileTypeDecorationProvider: reads query params from URI for color/badge decorations
- `src/common/uri.ts:437-449` -- `toResourceUri` implementation: scheme change to `filechange://`, query carries FileChangeNodeUriParams

### Secondary (MEDIUM confidence)
- GitHub REST API PR response structure -- `user.avatar_url` field path (well-documented in GitHub API docs, also empirically verifiable via stored `raw` data)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all VS Code built-in APIs
- Architecture: HIGH -- upstream fork demonstrates the exact pattern; verified in source
- Pitfalls: HIGH -- identified from code inspection of mock, URI scheme mechanics, and existing test patterns

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable VS Code API, unlikely to change)
