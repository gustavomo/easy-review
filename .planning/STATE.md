---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 06-07-PLAN.md
last_updated: "2026-04-04T17:59:40.847Z"
last_activity: 2026-04-04
progress:
  total_phases: 10
  completed_phases: 7
  total_plans: 41
  completed_plans: 40
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Generate deep, context-aware AI reviews of any GitHub PR (open, closed, or merged) directly inside VS Code, with everything persisted locally and shareable to Privanote.
**Current focus:** Phase 06 — multi-agent-pr-review-pipeline-with-model-selection

## Current Position

Phase: 07
Plan: Not started
Status: Ready to execute
Last activity: 2026-04-04

Progress: [█░░░░░░░░░] 17%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 6 | 3 tasks | 10 files |
| Phase 01 P03 | 8 | 2 tasks | 6 files |
| Phase 01 P04 | 5 | 2 tasks | 6 files |
| Phase 01-foundation P05 | 12 | 2 tasks | 5 files |
| Phase 01 P06 | 15 | 2 tasks | 8 files |
| Phase 01 P07 | 2 | 1 tasks | 1 files |
| Phase 01 P08 | 5 | 2 tasks | 2 files |
| Phase 02 P01 | 2 | 2 tasks | 5 files |
| Phase 02 P02 | 4 | 2 tasks | 6 files |
| Phase 02 P04 | 8 | 2 tasks | 4 files |
| Phase 02-ai-review-generation P03 | 2 | 2 tasks | 5 files |
| Phase 02 P05 | 2 | 2 tasks | 10 files |
| Phase 02-ai-review-generation P07 | 15 | 1 tasks | 1 files |
| Phase 02 P08 | 18 | 2 tasks | 4 files |
| Phase 02.1-in-editor-pr-navigation P01 | 3 | 2 tasks | 7 files |
| Phase 02.1-in-editor-pr-navigation P03 | 4 | 2 tasks | 4 files |
| Phase 02.1-in-editor-pr-navigation P02 | 4 | 2 tasks | 5 files |
| Phase 02.1-in-editor-pr-navigation P04 | 14 | 3 tasks | 8 files |
| Phase 02.2-sidebar-ui-enhancements P01 | 8 | 2 tasks | 7 files |
| Phase 02.2 P02 | 2 | 2 tasks | 2 files |
| Phase 05 P01 | 5 | 1 tasks | 1 files |
| Phase 05 P03 | 8 | 2 tasks | 3 files |
| Phase 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis P02 | 5 | 2 tasks | 2 files |
| Phase 02.3-review-panel-rich-rendering P01 | 5 | 2 tasks | 5 files |
| Phase 02.3-review-panel-rich-rendering P02 | 98 | 2 tasks | 3 files |
| Phase 02.3-review-panel-rich-rendering P03 | 5 | 2 tasks | 4 files |
| Phase 02.3-review-panel-rich-rendering P04 | 3 | 2 tasks | 3 files |
| Phase 07-changes-tree-file-icons-and-pr-author P01 | 5 | 2 tasks | 3 files |
| Phase 07-changes-tree-file-icons-and-pr-author P02 | 5 | 2 tasks | 2 files |
| Phase 06 P02 | 5 | 2 tasks | 3 files |
| Phase 06 P04 | 150 | 2 tasks | 5 files |
| Phase 06-multi-agent-pr-review-pipeline-with-model-selection P03 | 4 | 2 tasks | 12 files |
| Phase 06 P01 | 12 | 2 tasks | 6 files |
| Phase 06-multi-agent-pr-review-pipeline-with-model-selection P05 | 25 | 2 tasks | 3 files |
| Phase 06-multi-agent-pr-review-pipeline-with-model-selection P06 | 12 | 1 tasks | 1 files |
| Phase 06 P07 | 10 | 2 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1 prerequisite: Decide `better-sqlite3` vs `sql.js` and test in VS Code extension context before writing storage code
- Phase 1 prerequisite: Implement PATH resolution strategy (settings → shell-env → common paths) — core feature fails without it
- Phase 1 prerequisite: Define minimal-diff policy and upstream sync workflow before writing feature code
- Phase 1 prerequisite: Configure two-target build (esbuild for extension host, Vite for webview)
- [Phase 01]: Electron-rebuild spike restructured to smoke-test under system Node before Electron ABI rebuild to avoid NODE_MODULE_VERSION mismatch
- [Phase 01]: better-sqlite3 12.8.0 confirmed compatible with Electron 39.8.5 — Plan 01-03 storage implementation can proceed
- [Phase 01]: vitest --passWithNoTests used so test:unit exits 0 before stub implementations exist
- [Phase 01-01]: esbuild requires .gql and .svg text loaders — upstream imports GQL files as text
- [Phase 01-01]: tsconfig.json module stays as esnext — esbuild handles CJS output; changing tsconfig would break upstream webpack
- [Phase 01-01]: better-sqlite3 chosen over sql.js (confirmed) — native file-based SQLite, sync API
- [Phase 01]: Raw SQL chosen over Drizzle ORM — one table in Phase 1 does not justify ORM overhead
- [Phase 01]: STRICT SQLite table mode used — enforces type affinity at DB level, catches column mapping bugs early
- [Phase 01]: StorageAdapter interface retained for D-10 fallback path — enables future no-op fallback if native module fails
- [Phase 01]: Flat list (not grouped by state) per D-04 — simplest rendering, state conveyed by badge color
- [Phase 01]: Module-level getProvider()/getStore() exports in activation.ts for cross-command access without argument threading
- [Phase 01-foundation]: Octokit wiring deferred to Plan 01-06 — addPRByUrl command registered and validated, Octokit fetch pending upstream auth layer
- [Phase 01-foundation]: PRPersistenceService takes store + provider in constructor — testable without VS Code context
- [Phase 01]: activateEasyReview made async (Promise<void>) so health check awaits work; extension.ts awaits it
- [Phase 01]: SubprocessRunner uses settle-once flag to prevent double-resolve when close event and cancellation fire simultaneously
- [Phase 01]: PRW-02 Phase 1 satisfied via browser-open (vscode.env.openExternal) — full in-editor diff via PullRequestModel deferred to future phase
- [Phase 01]: activateEasyReview moved into deferredActivate() so credentialStore is available; parameter made optional for test backward compatibility
- [Phase 02]: Single-row policy (D-35) for project_analyses: DELETE + INSERT instead of UPSERT — ensures only one analysis row exists
- [Phase 02]: src/shared/types.ts kept browser-compatible (no vscode/Node imports) so Vite webview build can import via @shared alias
- [Phase 02]: CLIAdapter interface defined in ClaudeAdapter.ts, imported by CodexAdapter — co-located with primary implementor
- [Phase 02]: CodexAdapter defaults to plain-text stdout with JSON detection fallback (spike pending)
- [Phase 02]: settle() function clears 200ms batch interval and final flushes buffer before resolving/rejecting (Pitfall 7 prevention)
- [Phase 02-ai-review-generation]: Octokit diff type cast via (octokit as any) and response.data as unknown as string — Octokit TS types do not correctly type diff format response
- [Phase 02-ai-review-generation]: ReviewParser fallback: no ## headings found returns single section with title 'Review' — graceful handling of non-deterministic LLM output
- [Phase 02]: React 16 used for webview (not 18) — matches existing package.json; ReactDOM.render not createRoot
- [Phase 02]: complete state uses inline placeholder in ReviewPanel — Plan 06 replaces with ReviewDocument component
- [Phase 02-ai-review-generation]: ReviewPanel uses stateSync on ready handshake instead of retainContextWhenHidden:true
- [Phase 02-ai-review-generation]: Codicons localResourceRoots + CSP font-src wired in ReviewPanel constructor for webview icon rendering
- [Phase 02]: contextValue for PR tree items is pr-${state} — generateReview menu uses viewItem =~ /^pr-/ to match all states
- [Phase 02]: analyzePRHistory appends history section to existing contextText rather than replacing — preserves workspace analysis
- [Phase 02.1-01]: vitest config include expanded to src/easy-review/**/*.test.ts — test files co-located with source per plan spec
- [Phase 02.1-01]: buildDirectoryTree compacts virtual root (label='') by returning root.children — avoids spurious top-level directory wrapper
- [Phase 02.1-03]: Uri.from added to vscode mock — required for encodeDiffUri to construct URIs in test environment
- [Phase 02.1-03]: EMPTY sentinel checked before any Octokit call in EasyReviewDiffProvider — prevents 404 for added/deleted files
- [Phase 02.1-03]: In-memory URI cache in EasyReviewDiffProvider keyed by uri.toString() — VS Code calls provideTextDocumentContent twice per diff view
- [Phase 02.1-in-editor-pr-navigation]: await Promise.resolve() in loadFilesForPR ensures getChildren returns [LoadingNode] before children state changes — synchronous async path (no octokit) would set children='error' before return
- [Phase 02.1-in-editor-pr-navigation]: EventEmitter mock updated to propagate events — original mock had fire() as no-op, breaking retryLoadFiles event tests
- [Phase 02.1-in-editor-pr-navigation]: setCredentialStore() injection method added to EasyReviewPRsProvider — allows activation.ts to inject after construction without changing existing no-arg constructor call
- [Phase 02.1-in-editor-pr-navigation]: ready/loadPR handshake used instead of setTimeout — webview posts 'ready' message on mount, extension host replies with 'loadPR', eliminating race condition
- [Phase 02.1-in-editor-pr-navigation]: type=module attribute required on script tag and cspSource added to script-src CSP for ES module webviews (Vite output) to load correctly in VS Code webview
- [Phase 02.1-in-editor-pr-navigation]: PROverviewPanel is NOT a singleton — each openPROverview call creates a fresh panel in ViewColumn.Two
- [Phase 02.2-sidebar-ui-enhancements]: PRTreeItem contextValue uses hasReview boolean suffix pr-${state}-hasReview — queried from StorageAdapter.getReviews() at tree construction/refresh time
- [Phase 02.2-sidebar-ui-enhancements]: vscode mock extended with Disposable, l10n, ViewColumn, createWebviewPanel, Uri.joinPath, Uri.file().with() + vitest assetsInclude for .gql/.svg — fixes pre-existing test infrastructure gap from Phase 02.1 common/uri.ts import chain
- [Phase 02.2]: navigation@1/2/3 used for title bar button ordering: book(analysis), history(PR history), settings-gear(settings) — settings rightmost as least intrusive
- [Phase 02.2]: viewItem =~ /hasReview/ regex matches all three state variants for inline View Review button
- [Phase 05]: Wave 0 TDD scaffold created before implementation — makeOctokit() factory pattern used for per-test Octokit override in github-fetchers.test.ts
- [Phase 05]: ReviewComment interface defined inline in PromptBuilder.ts to avoid cross-plan import ordering issues in parallel execution
- [Phase 05]: SYNTHESIS_INSTRUCTION pattern: top-level const for large verbatim prompt blocks keeps buildPrompt() logic clean
- [Phase 05-02]: PromptBuilder.ts imports ReviewComment from DiffFetcher.ts — single source of truth for the interface, re-exported for backward compatibility
- [Phase 02.3-01]: parseCategorizedChanges and parseImpactAnalysis return null (not empty array) when no ### headings found — enables unambiguous null-check fallback to marked() in React components
- [Phase 02.3-01]: hasHighBreaking checks both name.includes('breaking') and impact==='high' — prevents false positives from other high-impact dimensions
- [Phase 02.3]: marked.use(markedHighlight()) at module-level applies globally to all marked() calls without per-call wiring
- [Phase 02.3]: No hljs theme CSS import — token colors applied via VS Code CSS vars only (D-04); .easy-review-md .hljs selector is additive over pre code reset
- [Phase 02.3-03]: npm install --legacy-peer-deps required for mermaid due to @opentelemetry/api peer conflict with vitest
- [Phase 02.3-03]: mermaid.initialize() at module level (not in component) — prevents re-initialization on every render (Pitfall 5)
- [Phase 02.3-03]: manualChunks consolidates mermaid+dagre into mermaid-bundle — prevents VS Code CSP blocking dynamic import() splits at runtime
- [Phase 02.3-04]: JSX transform (via Vite) handles React in webview — React import not needed in new components (ESLint no-unused-vars enforces this)
- [Phase 02.3-04]: isCategorizedSection + isImpactSection predicates placed after isFindingsSection and isMermaidSection for specificity order in ReviewDocument
- [Phase 07]: ThemeIcon.File replaces status-specific ThemeIcons: VS Code derives file-type icon from resourceUri.path extension using active icon theme
- [Phase 07]: vscode mock uses post-declaration assignment pattern for ThemeIcon static properties (class expression hoisting)
- [Phase 07]: getAvatarUrl() uses try/catch around JSON.parse — invalid raw field returns undefined without throwing (D-06)
- [Phase 07]: PRTreeItem description format is '{state} · @{author}' using U+00B7 middle dot as separator per UI-SPEC copywriting contract
- [Phase 07]: STATE_ICON map retained as fallback — not dead code despite avatar path being primary in PRTreeItem
- [Phase 06-02]: agentSections made optional in WebviewState generating variant — ReviewPanel.ts constructs generating state without agentSections; optional avoids breaking existing usage
- [Phase 06-02]: ModelAdapter interface: uniform run(opts) for all model types (claude/codex/ollama) — OllamaAdapter uses Node built-in fetch per CLAUDE.md constraint
- [Phase 06]: resolveAgentModel pure function with per-agent override taking precedence over defaultModel
- [Phase 06]: migrateActiveModel implements D-21: defaultModel wins if set, activeModel as fallback, 'claude' as hardcoded default
- [Phase 06]: Regex-based Mermaid validation in extension host — mermaid npm package is browser-only; lightweight type keyword check sufficient for D-16 self-correction loop
- [Phase 06]: Wave 0 TDD scaffold: vi.mock() factory + it.todo pattern for modules not yet implemented; pure-function modules get real tests immediately
- [Phase 06]: AgentOrchestrator tests use describe.todo because @anthropic-ai/claude-agent-sdk not installed until Plan 06-05
- [Phase 06-multi-agent-pr-review-pipeline-with-model-selection]: ADK require() pattern: const { query } = require('@anthropic-ai/claude-agent-sdk') as typeof import(...) — preserves TS type safety while avoiding ESM runtime issue in VS Code CJS extension host
- [Phase 06-multi-agent-pr-review-pipeline-with-model-selection]: Promise.allSettled used in AgentOrchestrator so individual agent failures return { status: error } without aborting other 6 agents
- [Phase 06]: ReviewPanel fetches GitHub data (diff, comments, commits) and passes diff+fileList to runAllAgents — orchestrator does not call GitHub directly
- [Phase 06]: er-spin @keyframes already extracted to webview.css — new components reference it directly, no inline style tag needed

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: In-Editor PR Navigation (INSERTED) — replace browser-open stub with VS Code diff editor view (file tree + diff editor per file)
- Phase 02.2 inserted after Phase 2: Sidebar UI Enhancements (INSERTED) — PR-level view review button, plugin-level project analysis / PR history analysis / settings buttons
- Phase 02.3 inserted after Phase 02.2: Review Panel Rich Rendering (INSERTED) — code blocks with syntax highlighting, Mermaid diagram rendering
- Phase 5 added: Upgrade review prompt to generate deep, insight-rich PR analysis
- Phase 6 added: Multi-agent PR review pipeline with model selection — 7 parallel agents, lazy context loading, diagram verification, Claude/Codex/Ollama per-agent model selection
- Phase 7 added: Changes Tree Enhancements — file type icons (VS Code icon theme) and PR author display on each PR tree item

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260403-no8 | Add easyReview.viewAnalysis command to view last stored project analysis | 2026-04-03 | a879c874 | [260403-no8-add-easyreview-viewanalysis-command-to-v](./quick/260403-no8-add-easyreview-viewanalysis-command-to-v/) |
| 260404-fc8 | Update review prompt section formats: Categorized Changes as table, Findings as flat prefixed list, Impact Analysis as table | 2026-04-04 | c8009d48 | [260404-fc8-update-review-prompt-section-formats-cat](./quick/260404-fc8-update-review-prompt-section-formats-cat/) |

### Blockers/Concerns

- Phase 1: `better-sqlite3` + electron-rebuild version matrix against current VS Code Electron version must be verified as first technical spike (MEDIUM confidence in research)
- Phase 2: Exact `claude` CLI output format and flags must be tested empirically before building ReviewParser
- Phase 3: `@modelcontextprotocol/sdk` current API shapes must be verified against current npm version before writing MCPClient
- Phase 4: Current `vsce` platform target flags and Marketplace native module policies must be verified before packaging

## Session Continuity

Last session: 2026-04-04T17:59:37.493Z
Stopped at: Completed 06-07-PLAN.md
Resume file: None
