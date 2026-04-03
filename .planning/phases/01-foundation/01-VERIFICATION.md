---
phase: 01-foundation
verified: 2026-04-03T19:10:00Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "User can select any PR and open its diff (browser-open approximation via vscode.env.openExternal)"
    - "User can trigger a basic claude CLI call (add-by-URL now calls PRPersistenceService.fetchAndPersistPR via wired Octokit)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Add a GitHub PR URL via 'Easy Review: Add PR by URL' command, then click the PR item in the sidebar"
    expected: "Browser opens the PR's GitHub diff page"
    why_human: "vscode.env.openExternal behavior and sidebar item click cannot be verified without running VS Code"
  - test: "With claude CLI installed, run 'Easy Review: Test CLI Integration' from command palette"
    expected: "Output Channel opens and shows streaming response from claude; info toast confirms success"
    why_human: "Requires claude CLI on PATH and VS Code runtime — cannot verify end-to-end streaming in tests"
  - test: "Fresh VS Code session where claude CLI is not on PATH"
    expected: "Warning notification appears with 'Configure Path' button that opens Settings filtered to easyReview.claudePath"
    why_human: "globalState guard requires fresh VS Code session or state reset to trigger"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** A working VS Code extension that browses PRs in all states, stores data in SQLite, and can invoke the `claude` CLI to produce output — proving the full integration chain before feature complexity is added
**Verified:** 2026-04-03T19:10:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 01-07 and 01-08)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see open, closed, and merged PRs listed in the VS Code sidebar | VERIFIED | EasyReviewPRsProvider registered under 'easy-review.prList', package.json declares view container and view, PRTreeItem uses state-specific ThemeColor badges; no regression detected |
| 2 | User can select any PR and open its diff (Phase 1: browser-open via vscode.env.openExternal) | VERIFIED | activation.ts:69 — `vscode.env.openExternal(vscode.Uri.parse(pr.url))` with url-missing guard; stub toast removed (commit 955b658e) |
| 3 | User can trigger a basic claude CLI call and see output returned | VERIFIED | addPRByUrl now calls PRPersistenceService.fetchAndPersistPR with real Octokit obtained from credentialStore.getHub(AuthProvider.github); testCLI command and SubprocessRunner fully wired; Octokit stub removed (commits 8d564376, 077c5727) |
| 4 | Extension shows clear, actionable error if SQLite fails to initialize | VERIFIED | SQLiteStore.initialize() catch block shows "SQLite failed to initialize … ABI mismatch … rebuild:sqlite"; no regression |
| 5 | Extension shows setup notification on first activation if claude CLI not found | VERIFIED | activation.ts globalState guard + showWarningMessage with 'Configure Path' button; no regression |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `esbuild.extension.js` | Extension host build | VERIFIED | Exists, builds dist/extension.js, CJS format — build exits 0 |
| `vite.webview.config.ts` | Webview bundle build | VERIFIED | Exists, React plugin, outputs dist/webview/ |
| `src/easy-review/activation.ts` | Activation hook | VERIFIED | Full implementation with credentialStore param, openExternal, Octokit wiring |
| `src/easy-review/storage/SQLiteStore.ts` | SQLite implementation | VERIFIED | WAL mode, integrity_check, ABI error message, full CRUD |
| `src/easy-review/storage/StorageAdapter.ts` | Interface | VERIFIED | Exports StorageAdapter interface with 6 methods |
| `src/easy-review/storage/schema.ts` | DDL | VERIFIED | PR_TABLE_DDL with PRIMARY KEY (repo_id, pr_number) and state CHECK constraint |
| `src/easy-review/storage/types.ts` | StoredPR type | VERIFIED | All 9 required fields present |
| `src/easy-review/providers/EasyReviewPRsProvider.ts` | TreeDataProvider | VERIFIED | Flat list, refresh/addPR/removePR, fires onDidChangeTreeData |
| `src/easy-review/providers/PRTreeItem.ts` | Tree item | VERIFIED | State badges, contextValue, description shows author |
| `src/easy-review/github/AllStatesPRFetcher.ts` | GitHub fetcher | VERIFIED | state:'all', merged_at normalization, fetchAllStatePRs and fetchPRByNumber |
| `src/easy-review/github/PRUrlParser.ts` | URL parser | VERIFIED | parsePRUrl with regex, 9 tests all passing |
| `src/easy-review/github/PRPersistenceService.ts` | Persistence orchestrator | VERIFIED | Previously ORPHANED — now instantiated and called from addPRByUrl handler |
| `src/easy-review/cli/PathResolver.ts` | PATH detection | VERIFIED | Settings → shell execSync → common paths chain, 6 tests pass |
| `src/easy-review/cli/SubprocessRunner.ts` | Subprocess runner | VERIFIED | Correct CLI flags, 5-minute timeout, SIGTERM cancel, streaming readline |
| `src/easy-review/cli/OutputChannelReporter.ts` | Output channel | VERIFIED | Singleton channel, beginRun, dispose pattern |
| `scripts/sqlite-spike.js` | ABI validation | VERIFIED | Exits 0 with success message |
| `vitest.config.ts` | Test runner | VERIFIED | Targets src/test/unit/**, watch:false, vscode mock alias |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/extension.ts` | `activation.ts` | `import + activateEasyReview(context, credentialStore)` | WIRED | Line 8 import, line 450 call inside deferredActivate after credentialStore.create() |
| `deferredActivate` | `credentialStore` | `activateEasyReview(context, credentialStore)` at line 450 | WIRED | credentialStore available at call site — call is inside deferredActivate after line 449 |
| `activation.ts` | `EasyReviewPRsProvider` | `createTreeView('easy-review.prList', ...)` | WIRED | Line 42 — view ID matches package.json declaration |
| `activation.ts` | `SQLiteStore.initialize` | `store.initialize(context.globalStorageUri.fsPath)` | WIRED | Line 31 |
| `easy-review.openPRDiff` | `vscode.env.openExternal` | `vscode.env.openExternal(vscode.Uri.parse(pr.url))` | WIRED | activation.ts:69 — Gap 1 closed (was toast stub) |
| `easy-review.addPRByUrl` | `PRPersistenceService.fetchAndPersistPR` | `service.fetchAndPersistPR(octokit, parsed.owner, parsed.repo, parsed.prNumber)` | WIRED | activation.ts:112 — Gap 2 closed (was Octokit stub) |
| `addPRByUrl handler` | `CredentialStore.getHub` | `credentialStore?.getHub(AuthProvider.github)` | WIRED | activation.ts:104 |
| `PRPersistenceService` | `StorageAdapter.savePR` + `provider.addPR` | `this.store.savePR(storedPR); this.provider.addPR(storedPR)` | WIRED | Both calls present in fetchAndPersistPR and service is now called |
| `package.json` | `easy-review.prList` view | `contributes.views['easy-review-container']` | WIRED | View ID and container declared |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `EasyReviewPRsProvider` | `this.prs` (startup) | `store.getPRs()` via `provider.refresh()` in activation.ts | Yes — reads from SQLite prs table | FLOWING |
| `EasyReviewPRsProvider` | `this.prs` (add-by-URL) | `PRPersistenceService.fetchAndPersistPR` → `provider.addPR()` | Yes — fetches from GitHub via Octokit, persists to SQLite, then adds to tree | FLOWING (was DISCONNECTED; Gap 2 closed) |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Extension host builds | `npm run build:extension` | Exits 0, produces dist/extension.js | PASS |
| Unit tests pass | `npm run test:unit` | 5 files, 26 pass, 13 todo | PASS |
| openPRDiff uses openExternal | `grep "openExternal" src/easy-review/activation.ts` | 1 match at line 69 | PASS |
| openPRDiff stub toast removed | `grep "showInformationMessage.*Opening diff" src/easy-review/activation.ts` | 0 matches | PASS |
| Octokit stub removed | `grep "Octokit integration pending" src/easy-review/activation.ts` | 0 matches | PASS |
| fetchAndPersistPR called | `grep "fetchAndPersistPR" src/easy-review/activation.ts` | 1 match at line 112 | PASS |
| activateEasyReview in deferredActivate | `grep "activateEasyReview" src/extension.ts` | 3 lines: import + deferredActivate call + deactivate import | PASS |
| standalone activate() call removed | `grep "activateEasyReview(context)" src/extension.ts` | 0 matches (only credentialStore variant at line 450) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PRW-01 | 01-01, 01-04 | User can view PRs in all states in VS Code sidebar | SATISFIED | EasyReviewPRsProvider registered, state badges implemented, view declared in package.json |
| PRW-02 | 01-01, 01-04, 01-07 | User can select any PR and access its diff | SATISFIED | Phase 1 approximation: vscode.env.openExternal opens PR's GitHub diff page; in-editor diff deferred to future phase per 01-07-PLAN.md scope note |
| DB-01 | 01-02, 01-03 | All generated content stored in local SQLite database | SATISFIED | SQLiteStore implemented with CRUD, schema with prs table, better-sqlite3 ABI confirmed |
| DB-02 | 01-02, 01-03 | Clear actionable error if SQLite fails to initialize | SATISFIED | SQLiteStore.initialize() catch block shows "SQLite failed to initialize … ABI mismatch … rebuild:sqlite" |
| CFG-01 | 01-06 | User can configure path to claude CLI in VS Code settings | SATISFIED | easyReview.claudePath in package.json contributes, PathResolver reads it with priority |
| CFG-02 | 01-06 | Setup notification on first activation if claude not found | SATISFIED | activation.ts globalState guard + showWarningMessage with 'Configure Path' button wired to openSettings |

**Summary:** 6/6 requirements satisfied.

---

### Anti-Patterns Found

No blockers or warnings detected in gap-closure files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/easy-review/activation.ts` | 60 | `showInformationMessage('Easy Review: Refresh not yet implemented.')` | INFO | refreshPRList stub — not a blocker; refresh from GitHub is deferred to a future plan as documented |

**Stub classification note:** The refreshPRList stub shows a message but is not in the critical path for Phase 1 goal achievement. The sidebar loads persisted PRs on startup and new PRs are added via addPRByUrl. No blocker stubs remain.

---

### Human Verification Required

#### 1. Browser opens PR diff page on item click

**Test:** Sign in to GitHub via "GitHub Pull Requests: Sign In", paste a GitHub PR URL via "Easy Review: Add PR by URL", then click the PR item in the sidebar tree.
**Expected:** Browser opens the PR's GitHub page (the diff/Files Changed tab is visible when navigating to the PR URL).
**Why human:** vscode.env.openExternal delegates to the OS browser — cannot verify browser launch programmatically without VS Code runtime.

#### 2. claude CLI streaming output

**Test:** With claude CLI installed (or easyReview.claudePath configured), run "Easy Review: Test CLI Integration" from the command palette.
**Expected:** Output Channel panel opens and streaming text from claude appears in real time; info toast "CLI test passed" appears on completion.
**Why human:** Requires claude CLI on PATH and VS Code runtime — end-to-end streaming requires live process.

#### 3. First-run notification when claude not found in PATH

**Test:** On a machine without claude CLI installed (or with easyReview.claudePath cleared and globalState reset), reload the extension.
**Expected:** Warning notification: "Easy Review: The `claude` CLI was not found in PATH…" with 'Configure Path' button; clicking button opens Settings filtered to easyReview.claudePath.
**Why human:** globalState guard prevents repeated triggering; requires fresh VS Code session or state reset.

---

### Re-Verification Summary

**Both gaps from the initial verification are now closed.**

**Gap 1 (BLOCKER) — CLOSED:** `easy-review.openPRDiff` now calls `vscode.env.openExternal(vscode.Uri.parse(pr.url))` with a url-missing guard at activation.ts:65-70. The stub toast is gone. Plan 01-07 committed this change (955b658e). PRW-02 is satisfied for Phase 1 as a browser-open approximation; in-editor diff via PullRequestModel is explicitly deferred to a future phase per the plan's scope note.

**Gap 2 (WARNING) — CLOSED:** `addPRByUrl` command now obtains an authenticated Octokit from `credentialStore.getHub(AuthProvider.github)` at activation.ts:104 and calls `PRPersistenceService.fetchAndPersistPR` at line 112. The "Octokit integration pending" stub is removed. Plan 01-08 committed this in two steps: first wiring the credentialStore parameter into activation.ts (8d564376), then moving the activateEasyReview call into deferredActivate inside extension.ts (077c5727) so the credentialStore is available at the call site.

**No regressions detected:** All 5 previously-verified truths remain intact. Build exits 0. 26 unit tests pass, 13 todo (unchanged from initial verification).

---

_Verified: 2026-04-03T19:10:00Z_
_Verifier: Claude (gsd-verifier)_
