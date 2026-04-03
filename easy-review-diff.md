# Easy Review — Upstream Diff Manifest

Lists every upstream file from microsoft/vscode-pull-request-github that has been modified.
Update this file any time an upstream file is touched.

## Modified Files

| File | Change | Reason |
|------|--------|--------|
| src/extension.ts | Added import and call to easy-review/activation.ts | Hook easy-review activation into extension lifecycle |
| package.json | name, displayName, description; added better-sqlite3, @electron/rebuild, @types/better-sqlite3; updated @types/vscode to ^1.110.0; added build:extension, build:webview, rebuild:sqlite scripts; added easyReview.claudePath configuration | Easy Review fork configuration |

## New Files (not in upstream)

All files under `src/easy-review/` are new — not upstream modifications.

| File | Purpose |
|------|---------|
| esbuild.extension.js | Extension host build script — CommonJS output, externalizes vscode and better-sqlite3 |
| vite.webview.config.ts | Webview bundle build — browser bundle, outputs dist/webview/ |
| src/easy-review/activation.ts | Top-level activate/deactivate hook called from src/extension.ts |
| src/shared/types.ts | Shared types between extension host and webview |
| easy-review-diff.md | This file — upstream diff manifest |

## Policy

- Never modify: PullRequestManager, GitHubRepository, or auth layers.
- Extend via composition only.
- All new Easy Review code lives under `src/easy-review/`.
- Update this file whenever an upstream file is touched.

## Upstream Sync

Upstream remote: `https://github.com/microsoft/vscode-pull-request-github.git`
Merged at: upstream/main (commit aa7eb418)
