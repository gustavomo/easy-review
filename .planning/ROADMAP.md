# Roadmap: Easy Review

## Overview

Easy Review is built in four phases, each delivering a coherent capability. Phase 1 establishes the fork infrastructure and proven integration chain (PR browsing, SQLite, CLI subprocess). Phase 2 builds the core AI review loop with structured output and project analysis — the primary differentiator. Phase 3 adds two-way Privanote integration, strictly optional and gracefully degrading. Phase 4 closes the loop with GitHub comment posting and prepares the extension for Marketplace distribution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Fork setup, PR browsing all states, SQLite store, CLI subprocess runner, PATH resolution (completed 2026-04-03)
- [x] **Phase 2: AI Review Generation** - Full review pipeline, 6-section structured output, project analysis context, webview panel (completed 2026-04-03)
- [x] **Phase 2.1: In-Editor PR Navigation** (INSERTED) - Replace browser-open stub with VS Code diff view: expandable file tree per PR, diff editor per file (completed 2026-04-03)
- [x] **Phase 2.2: Sidebar UI Enhancements** (INSERTED) - PR-level view review button, plugin-level buttons for project analysis, PR history analysis, and settings (completed 2026-04-03)
- [x] **Phase 02.3: Review Panel Rich Rendering** (INSERTED) - Syntax highlighting, Mermaid SVG diagrams, categorized change chips, impact badges, markdown tables (completed 2026-04-03)
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
- [x] 02-02-PLAN.md — SQLite schema extension (reviews + project_analyses tables) + StorageAdapter methods + shared message types
- [x] 02-03-PLAN.md — DiffFetcher (Octokit diff fetch) + PromptBuilder (6-section prompt) + ReviewParser (section splitter)
- [x] 02-04-PLAN.md — ClaudeAdapter + CodexAdapter + ReviewRunner (200ms batch streaming + CancellationToken)
- [x] 02-05-PLAN.md — React webview Part 1: entry point + ReviewPanel state machine + PanelHeader + IdleView + ErrorView + StreamingView
- [x] 02-06-PLAN.md — React webview Part 2: ReviewDocument + CollapsibleSection + FindingsSection + FindingCard + DiffBlock
- [x] 02-07-PLAN.md — ReviewPanel extension host singleton (orchestration: diff → prompt → CLI → parse → persist → webview)
- [x] 02-08-PLAN.md — Command wiring (activation.ts: generateReview + analyzeProject + analyzePRHistory) + ProjectAnalysisService + package.json settings
- [x] 02-09-PLAN.md — Human verification in Extension Development Host (all 11 requirements)
**UI hint**: yes

### Phase 02.3: review-panel-rich-rendering (INSERTED)

**Goal:** Upgrade the review webview panel to rich visual rendering — syntax highlighting for all code blocks, live Mermaid SVG diagram rendering, dedicated visual components for Categorized Changes (category chips + bullet lists) and Impact Analysis (dimension blocks + impact badges + breaking changes warning), and markdown table CSS styles.
**Requirements**: POL-01, D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20
**Depends on:** Phase 02
**Plans:** 4/4 plans complete

Plans:
- [x] 02.3-01-PLAN.md — Wave 0: vitest config + parseCategorizedChanges.ts + parseImpactAnalysis.ts + unit tests
- [x] 02.3-02-PLAN.md — highlight.js + marked-highlight install; global marked config; hljs CSS token overrides + markdown table styles
- [x] 02.3-03-PLAN.md — MermaidDiagram.tsx component + ReviewPanel.ts CSP unsafe-eval + vite.webview.config.ts chunk consolidation
- [x] 02.3-04-PLAN.md — CategorizedChangesSection.tsx + ImpactAnalysisSection.tsx + ReviewDocument.tsx routing update

### Phase 02.1: In-Editor PR Navigation (INSERTED)

**Goal**: Clicking a PR in the sidebar opens it in-editor like the GitHub Pull Requests plugin — the PR tree item expands to show the list of changed files, and clicking any file opens a diff editor with before/after content fetched from the GitHub API. Replaces the Phase 1 browser-open stub (`vscode.env.openExternal`).
**Depends on**: Phase 2
**Requirements**: PRW-02 (upgrade), NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. Clicking a PR in the Easy Review sidebar expands it to show its changed files (not opens a browser)
  2. Each changed file shows its filename and change status (modified/added/deleted)
  3. Clicking a file opens a VS Code diff editor with the before (base commit) and after (head commit) content
  4. The diff editor title shows the PR number and filename
**Plans**: 4 plans

Plans:
- [x] 02.1-01-PLAN.md — Wave 0 test stubs + EasyReviewTreeNodes union type + buildDirectoryTree() pure function
- [x] 02.1-02-PLAN.md — EasyReviewPRsProvider 3-level tree (async getChildren, loading/error states) + PRTreeItem upgrade + PRFileFetcher
- [x] 02.1-03-PLAN.md — EasyReviewDiffProvider (TextDocumentContentProvider for easy-review-diff://) + diffUri encode/decode helpers
- [x] 02.1-04-PLAN.md — PROverviewPanel (React webview + extension host class) + activation.ts wiring + package.json + vite config

### Phase 02.2: Sidebar UI Enhancements (INSERTED)

**Goal**: Add visible action buttons to the Easy Review sidebar — a PR-level inline button to view its stored AI review, and plugin-level title bar buttons for viewing project analysis, viewing PR history analysis, and opening the extension settings (including the claude/codex model selector).
**Depends on**: Phase 2.1
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Each PR in the sidebar has an inline "View Review" button (visible on hover) that opens the ReviewPanel for that PR's stored review
  2. The sidebar title bar shows a "View Project Analysis" button that opens the stored project analysis document
  3. The sidebar title bar shows a "View PR History Analysis" button that opens the stored PR history analysis document
  4. The sidebar title bar shows a "Settings" button that opens VS Code settings filtered to the `easyReview.*` namespace
**Plans**: 2 plans

Plans:
- [x] 02.2-01-PLAN.md — PRTreeItem hasReview contextValue + EasyReviewPRsProvider store injection + ReviewPanel.loadReview() + unit tests
- [x] 02.2-02-PLAN.md — package.json commands + menu contributions + activation.ts command registration + post-review refresh hook

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
Phases execute in numeric order: 1 → 2 → 2.1 → 2.2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 8/8 | Complete | 2026-04-03 |
| 2. AI Review Generation | 9/9 | Complete | 2026-04-03 |
| 2.1. In-Editor PR Navigation | 4/4 | Complete | 2026-04-03 |
| 2.2. Sidebar UI Enhancements | 2/2 | Complete | 2026-04-03 |
| 2.3. Review Panel Rich Rendering | 4/4 | Complete | 2026-04-03 |
| 5. Upgrade review prompt | 4/4 | Complete | 2026-04-03 |
| 6. Multi-agent PR review pipeline | 5/8 | In Progress|  |
| 7. Changes Tree — File Icons and PR Author | 2/2 | Complete   | 2026-04-04 |
| 3. Privanote Integration | 0/? | Not started | - |
| 4. GitHub Comment Posting and Distribution | 0/? | Not started | - |

### Phase 5: Upgrade review prompt to generate deep, insight-rich PR analysis

**Goal:** Replace the thin instructions block in PromptBuilder.ts with a production-quality SYNTHESIS_INSTRUCTION, fetch GitHub review comments and commit messages, and wire all new data into the review generation pipeline — transforming output from structured checklist to insight-rich PR analysis
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12
**Depends on:** Phase 2 (uses PromptBuilder, ReviewParser, ReviewPanel, DiffFetcher)
**Plans:** 4/4 plans executed

Plans:
- [x] 05-01-PLAN.md — Wave 0: github-fetchers.test.ts scaffold (fetchReviewComments + fetchPRCommits tests)
- [x] 05-02-PLAN.md — DiffFetcher.ts new fetchers + BuildPromptOptions extension (reviewComments, prUrl)
- [x] 05-03-PLAN.md — PromptBuilder.ts SYNTHESIS_INSTRUCTION rewrite + ReviewParser.ts heading rename + test fixture updates
- [x] 05-04-PLAN.md — ReviewPanel.ts wiring: Promise.all, commitMessages, reviewComments, prUrl

### Phase 6: Multi-agent PR review pipeline with model selection

**Goal:** Replace the single-agent review generator with a 7-agent parallel pipeline (PR Summarizer, Bug Risk, Architecture Change, Test Coverage, Documentation, Diagram, Business Impact). Each agent runs concurrently and receives only the PR diff + file list by default — project context and commit history are loaded lazily only when an agent opts in. The Diagram agent validates Mermaid syntax before marking the review complete. A multi-model strategy supports Claude, Codex, and Ollama (gemma4) with per-agent model selection via VS Code settings.
**Requirements**: TBD
**Depends on:** Phase 5
**Plans:** 5/8 plans executed

Plans:
- [x] 06-01-PLAN.md — Wave 0: TDD scaffolds (AgentOrchestrator.test.ts + OllamaAdapter.test.ts + contextRequest.test.ts + mermaidValidation.test.ts + ReviewParser 7-section tests + modelSettings.test.ts)
- [x] 06-02-PLAN.md — Wave 1: shared types (AgentKey, SectionState, sectionUpdate message) + ModelAdapter interface + OllamaAdapter
- [x] 06-03-PLAN.md — Wave 1: contextRequest.ts + mermaidValidation.ts utilities + 7 per-agent prompt templates
- [x] 06-04-PLAN.md — Wave 1: ReviewParser 7-section update (bug keyword) + modelSettings.ts + package.json settings
- [x] 06-05-PLAN.md — Wave 2: AgentOrchestrator.ts (Promise.allSettled 7 agents, ADK + Codex + Ollama paths, Mermaid retry) + esbuild ADK bundle
- [x] 06-06-PLAN.md — Wave 3: ReviewPanel.ts (extension host) refactor — executeReview delegates to runAllAgents
- [ ] 06-07-PLAN.md — Wave 4: AgentStatusBar + AgentSlot + SectionPendingPlaceholder + DiagramErrorBanner + CollapsibleSection/PanelHeader updates
- [ ] 06-08-PLAN.md — Wave 5: ReviewDocument 7-slot progressive layout + webview ReviewPanel sectionUpdate handling + human verification

### Phase 7: Changes Tree Enhancements — File Icons and PR Author

**Goal:** Improve the sidebar changes tree with two visual upgrades: (1) show the VS Code file-type icon next to each changed file using the active icon theme (`vscode.ThemeIcon.File` + `resourceUri`), and (2) display the PR creator's GitHub avatar on each PR tree item with state text in the description field.
**Requirements**: TREE-01, TREE-02, TREE-03
**Depends on:** Phase 2.1 (EasyReviewPRsProvider tree)
**Plans:** 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — vscode mock ThemeIcon.File + FileNode iconPath change + file-type icon tests
- [x] 07-02-PLAN.md — PRTreeItem avatar iconPath + combined state+author description + tests
