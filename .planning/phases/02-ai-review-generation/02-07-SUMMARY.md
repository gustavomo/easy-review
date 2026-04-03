---
phase: 02-ai-review-generation
plan: 07
subsystem: ui
tags: [vscode, webview, singleton, streaming, sqlite, review-panel]

# Dependency graph
requires:
  - phase: 02-ai-review-generation
    provides: ReviewRunner (runReview), ReviewParser (parseReview), PromptBuilder (buildPrompt), DiffFetcher (fetchPRDiff), StorageAdapter (saveReview, getReviews, getProjectAnalysis), shared message types
provides:
  - ReviewPanel singleton (src/easy-review/panel/ReviewPanel.ts) — WebviewPanel lifecycle, message bus, review orchestration
  - getOrCreate() factory — opens vscode.ViewColumn.Two, reuses existing panel
  - startReview() — full orchestration chain: diff fetch → prompt build → CLI run → parse → persist → postMessage
  - 200ms batch streaming: ReviewRunner.onChunk → buffer → postMessage(streamChunk)
  - stateSync handshake on ready message (Pitfall 3 fix)
  - onDidDispose clears static instance (Pitfall 4 fix)
  - clearInterval in finally block (Pitfall 7 fix)
  - Queue: one-at-a-time review execution with queue drain
  - loadReview, cancelReview, retryReview message handlers
affects: [02-08, activation-ts, webview-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Singleton VS Code WebviewPanel via static instance + getOrCreate()"
    - "stateSync handshake on ready message instead of retainContextWhenHidden"
    - "200ms batch setInterval with finally-block clearInterval and final buffer flush"
    - "CancellationTokenSource per review execution, disposed in finally"
    - "Fire-and-forget queue drain: runTask() not awaited in finally"

key-files:
  created:
    - src/easy-review/panel/ReviewPanel.ts
  modified: []

key-decisions:
  - "ReviewPanel uses stateSync on ready handshake instead of retainContextWhenHidden:true — avoids stale webview state after panel hide/show"
  - "loadReview handler reads repoId/prNumber from currentState.review — avoids threading context through messages"
  - "Codicons localResourceRoots + CSP font-src wired in constructor so webview can render VS Code icons"
  - "requestState message handled (in addition to ready) for defensive state recovery"

patterns-established:
  - "Pattern: singleton panel — static instance, getOrCreate(), onDidDispose clears instance"
  - "Pattern: 200ms batch interval always cleared in finally with final buffer flush"
  - "Pattern: postMessage wrapped in try/catch to guard against disposed panel"

requirements-completed: [REV-01, REV-03, REV-04, VIEW-01, VIEW-03]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 02 Plan 07: ReviewPanel Extension Host Singleton Summary

**Singleton WebviewPanel orchestrator wiring DiffFetcher → PromptBuilder → ReviewRunner → parseReview → saveReview with 200ms batched streaming and stateSync handshake**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T21:30:00Z
- **Completed:** 2026-04-03T21:45:00Z
- **Tasks:** 1 of 1
- **Files modified:** 1 (created)

## Accomplishments

- Created `src/easy-review/panel/ReviewPanel.ts` — the integration hub for Phase 2
- Implemented singleton pattern (static instance + getOrCreate + onDidDispose cleanup)
- Full review orchestration chain: DiffFetcher → PromptBuilder → ReviewRunner → ReviewParser → StorageAdapter
- 200ms batch streaming: ReviewRunner.onChunk accumulates into buffer → postMessage(streamChunk), always cleared in finally block
- stateSync handshake on ready message (Pitfall 3 fix), retainContextWhenHidden:false
- Queue system: one active review at a time, second calls queued (D-02)
- loadReview, cancelReview, retryReview, requestState message handlers wired
- Codicons CSS included in webview HTML for VS Code icon rendering

## Task Commits

1. **Task 1: ReviewPanel extension host singleton** - `ba3fce24` (feat)

## Files Created/Modified

- `src/easy-review/panel/ReviewPanel.ts` - Singleton WebviewPanel lifecycle, message bus, review orchestration (352 lines)

## Decisions Made

- `requestState` message handled in addition to `ready` handshake — defensive recovery path if webview sends this message
- `loadReview` handler reads `repoId`/`prNumber` from `currentState.review` rather than accepting them in the message — avoids extra message fields and keeps webview message protocol minimal
- Codicons included via `localResourceRoots` + CSP `style-src ${cspSource}; font-src ${cspSource}` so VS Code icon font renders in the webview iframe

## Deviations from Plan

None — plan executed exactly as written. The `requestState` message handler was added as Rule 2 (missing critical functionality) since the shared types define `{ type: 'requestState' }` in `WebviewMessage` but the plan didn't list it in the handler switch. Added silently.

## Issues Encountered

None — `npm run build:extension` exited 0 on first attempt with no TypeScript errors.

## Known Stubs

None — ReviewPanel.ts is wiring code. No placeholder data flows to UI rendering; all review data comes through the live orchestration chain.

## Next Phase Readiness

- ReviewPanel.ts is complete and the build passes
- Plan 02-08 (activation.ts wiring) can now register the `easyReview.generateReview` command and call `ReviewPanel.getOrCreate(...).startReview(pr, credentialStore)`
- The webview UI (Plan 02-06) connects via the message protocol already implemented here

---
*Phase: 02-ai-review-generation*
*Completed: 2026-04-03*

## Self-Check: PASSED

- `src/easy-review/panel/ReviewPanel.ts` — FOUND
- Commit `ba3fce24` — FOUND
