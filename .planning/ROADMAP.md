# Roadmap: Easy Review

## Overview

Easy Review is built in four phases, each delivering a coherent capability. Phase 1 establishes the fork infrastructure and proven integration chain (PR browsing, SQLite, CLI subprocess). Phase 2 builds the core AI review loop with structured output and project analysis — the primary differentiator. Phase 3 adds two-way Privanote integration, strictly optional and gracefully degrading. Phase 4 closes the loop with GitHub comment posting and prepares the extension for Marketplace distribution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Fork setup, PR browsing all states, SQLite store, CLI subprocess runner, PATH resolution (completed 2026-04-03)
- [ ] **Phase 2: AI Review Generation** - Full review pipeline, 6-section structured output, project analysis context, webview panel
- [ ] **Phase 3: Privanote Integration** - MCP context injection before reviews, REST API push of completed reviews, SecretStorage token handling
- [ ] **Phase 4: GitHub Comment Posting and Distribution** - Post reviews to GitHub with user confirmation, per-platform Marketplace packaging

## Phase Details

### Phase 1: Foundation
**Goal**: A working VS Code extension that browses PRs in all states, stores data in SQLite, and can invoke the `claude` CLI to produce output — proving the full integration chain before feature complexity is added
**Depends on**: Nothing (first phase)
**Requirements**: PRW-01, PRW-02, DB-01, DB-02, CFG-01, CFG-02
**Success Criteria** (what must be TRUE):
  1. User can see open, closed, and merged PRs listed in the VS Code sidebar
  2. User can select any PR and view its diff in the VS Code diff editor
  3. User can trigger a basic `claude` CLI call from the extension and see output returned (no structured format yet)
  4. Extension shows a clear, actionable error if SQLite fails to initialize (e.g., ABI mismatch)
  5. Extension shows a setup notification on first activation if the `claude` CLI is not found in PATH, with instructions to configure the path in settings
**Plans**: 8 plans
Plans:
- [x] 01-01-PLAN.md — Fork setup + two-target build pipeline (esbuild + Vite) + easy-review-diff.md
- [x] 01-02-PLAN.md — Test infrastructure (vitest + stubs) + electron-rebuild spike (better-sqlite3 ABI validation)
- [x] 01-03-PLAN.md — StorageAdapter interface + SQLiteStore with WAL mode and ABI error handling
- [x] 01-04-PLAN.md — EasyReviewPRsProvider flat list + PRTreeItem state badges + AllStatesPRFetcher
- [x] 01-05-PLAN.md — PRUrlParser + PRPersistenceService + AddByURL/RemovePR commands
- [x] 01-06-PLAN.md — PathResolver (CJS-safe) + SubprocessRunner (streaming + cancel + timeout) + activation health checks
- [x] 01-07-PLAN.md — Gap closure: replace openPRDiff stub with vscode.env.openExternal (PRW-02)
- [x] 01-08-PLAN.md — Gap closure: wire CredentialStore into activateEasyReview so addPRByUrl calls fetchAndPersistPR
**UI hint**: yes

### Phase 2: AI Review Generation
**Goal**: Users can generate deep, structured AI reviews for any PR, see real-time progress during generation, view the full 6-section review in a webview panel, and have all reviews automatically persisted and accessible as history
**Depends on**: Phase 1
**Requirements**: REV-01, REV-02, REV-03, REV-04, REV-05, VIEW-01, VIEW-02, VIEW-03, PROJ-01, PROJ-02, PROJ-03
**Success Criteria** (what must be TRUE):
  1. User can trigger AI review generation for any PR (open, closed, or merged) with a single command and see real-time streaming progress in the webview
  2. Completed review displays the full 6-section structured format (Executive Summary, Categorized Changes, Key Code Changes with before/after snippets, Findings by severity, Impact Analysis, Mermaid diagram) in the webview panel
  3. User can run a one-time project analysis; the resulting context is stored in SQLite and reused automatically in all subsequent reviews without re-running
  4. User can view all previously generated reviews for any PR, each timestamped
  5. User can re-generate a review for the same PR and both versions are preserved side-by-side with timestamps
**Plans**: 9 plans
Plans:
- [x] 02-01-PLAN.md — Wave 0 test stubs: review-runner, review-parser, prompt-builder, project-analysis, sqlite (extended)
- [ ] 02-02-PLAN.md — SQLite schema extension (reviews + project_analyses tables) + StorageAdapter methods + shared message types
- [ ] 02-03-PLAN.md — DiffFetcher (Octokit diff fetch) + PromptBuilder (6-section prompt) + ReviewParser (section splitter)
- [ ] 02-04-PLAN.md — ClaudeAdapter + CodexAdapter + ReviewRunner (200ms batch streaming + CancellationToken)
- [ ] 02-05-PLAN.md — React webview Part 1: entry point + ReviewPanel state machine + PanelHeader + IdleView + ErrorView + StreamingView
- [ ] 02-06-PLAN.md — React webview Part 2: ReviewDocument + CollapsibleSection + FindingsSection + FindingCard + DiffBlock
- [ ] 02-07-PLAN.md — ReviewPanel extension host singleton (orchestration: diff → prompt → CLI → parse → persist → webview)
- [ ] 02-08-PLAN.md — Command wiring (activation.ts: generateReview + analyzeProject + analyzePRHistory) + ProjectAnalysisService + package.json settings
- [ ] 02-09-PLAN.md — Human verification in Extension Development Host (all 11 requirements)
**UI hint**: yes

### Phase 3: Privanote Integration
**Goal**: Reviews are enriched with relevant Privanote notes context before generation, completed reviews can be pushed to Privanote as searchable notes, and the Privanote API token is stored securely — all without ever blocking review generation if Privanote is unavailable
**Depends on**: Phase 2
**Requirements**: PRIV-01, PRIV-02, PRIV-03, PRIV-04
**Success Criteria** (what must be TRUE):
  1. When Privanote MCP server is running, review generation includes relevant notes context pulled from Privanote before the prompt is assembled
  2. When Privanote MCP server is unavailable, review generation completes normally with no degraded output and no blocking error shown to the user
  3. User can send a completed review to Privanote as a new note via REST API from within the extension
  4. Privanote API token is stored in VS Code SecretStorage and is never visible in settings or globalState
**Plans**: TBD

### Phase 4: GitHub Comment Posting and Distribution
**Goal**: Users can post stored reviews as GitHub PR comments directly from the extension (with explicit confirmation), and the extension is packaged and ready for Marketplace distribution
**Depends on**: Phase 3
**Requirements**: GH-01, GH-02
**Success Criteria** (what must be TRUE):
  1. User can post a stored review as a GitHub PR comment from within the VS Code webview
  2. Extension always requires explicit user confirmation before any content is posted to GitHub — no accidental posts are possible
  3. Extension is packaged as a `.vsix` and installs successfully from the Marketplace (or sideload) on macOS arm64, macOS x64, Windows x64, and Linux x64
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 8/8 | Complete   | 2026-04-03 |
| 2. AI Review Generation | 1/9 | In Progress|  |
| 3. Privanote Integration | 0/? | Not started | - |
| 4. GitHub Comment Posting and Distribution | 0/? | Not started | - |
