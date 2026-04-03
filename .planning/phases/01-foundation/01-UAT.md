---
status: complete
phase: 01-foundation
source: [01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Extension Activates
expected: Open VS Code in the easy-review repo folder. Press F5 to launch the Extension Development Host. The host window opens without errors. No "extension failed to activate" notification appears. The Easy Review icon is visible in the activity bar.
result: pass
note: Fixed — esbuild mainFields + launch.json disable-extension. Extension now activates. SQLite ABI notification appeared (expected DB-02 behavior, not an activation failure).

### 2. Easy Review Sidebar Loads
expected: Click the Easy Review icon in the activity bar. A panel opens showing an "Easy Review PRs" tree view (may be empty on first open). A "+" button is visible in the view title bar to add PRs.
result: pass

### 3. First-Run CLI Notification
expected: With `claude` not configured in settings, the extension should show a warning notification on first activation: something like "Claude CLI not found" with a "Configure Path" button. (If claude is already on your PATH this may not appear — mark as skip if so.)
result: skipped
reason: claude is already on PATH

### 4. Add PR by URL
expected: Click the "+" button in the Easy Review PRs view (or run "Easy Review: Add PR by URL" from the command palette). An input box appears prompting for a GitHub PR URL. Enter a valid URL (e.g. https://github.com/microsoft/vscode/pull/12345). The extension fetches the PR and it appears in the sidebar list.
result: pass

### 5. PR State Badges
expected: After adding PRs of different states, the sidebar list shows colored state badges: open PRs have a green indicator, closed PRs have a red indicator, and merged PRs have a purple indicator.
result: pass

### 6. Open PR in Browser
expected: Click on any PR item in the Easy Review sidebar. Your default browser opens to that PR's GitHub page (e.g. github.com/owner/repo/pull/N). No toast notification appears.
result: pass

### 7. Remove PR
expected: Right-click a PR item in the sidebar. A context menu appears with a "Remove" option. Clicking it shows a confirmation dialog. Confirming removes the PR from the list.
result: pass

### 8. Test CLI Integration
expected: Open the command palette (Cmd+Shift+P), run "Easy Review: Test CLI Integration". The Output Channel panel opens (or becomes visible) and shows some streaming output from the claude CLI, or an error message if claude is not found on PATH.
result: pass
note: Required fix — added --verbose to SubprocessRunner spawn args (claude 2.1.87+ requires it with --output-format stream-json). Also updated JSON parser for nested event.event.delta.text. Output showed "Easy Review Phase 1 integration test: OK".

## Summary

total: 8
passed: 7
issues: 0
pending: 0
skipped: 1
skipped: 0
blocked: 0

## Gaps
