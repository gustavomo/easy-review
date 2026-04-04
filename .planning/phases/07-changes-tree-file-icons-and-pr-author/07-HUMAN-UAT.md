---
status: partial
phase: 07-changes-tree-file-icons-and-pr-author
source: [07-VERIFICATION.md]
started: 2026-04-04T17:37:16Z
updated: 2026-04-04T17:37:16Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. File-type icons render from active icon theme
expected: Changed files in the Easy Review sidebar tree show language-specific icons (TypeScript file shows TS icon, JSON shows JSON icon, etc.) matching the user's active VS Code icon theme. Label color decorations (green/orange/red for added/modified/removed) are still visible.
result: [pending]

### 2. Avatar images load from GitHub CDN
expected: PR items in the sidebar show the author's GitHub avatar as the tree icon. The avatar loads from GitHub CDN (vscode.Uri as iconPath triggers a network fetch VS Code handles at runtime). No broken image placeholder appears for PRs that have stored raw data with a valid avatar_url.
result: [pending]

### 3. Description text visible in tree
expected: Each PR item's description shows "{state} · @{author}" format with middle dot separator (e.g. "open · @alice", "merged · @bob"). The description is visible in the sidebar below or alongside the PR title.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
