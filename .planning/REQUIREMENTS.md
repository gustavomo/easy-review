# Requirements: Easy Review

**Defined:** 2026-04-03
**Core Value:** Generate deep, context-aware AI reviews of any GitHub PR (open, closed, or merged) directly inside VS Code, with everything persisted locally and shareable to Privanote.

## v1 Requirements

### PR Browsing

- [x] **PRW-01**: User can view PRs in all states (open, closed, merged) in the VS Code sidebar
- [x] **PRW-02**: User can select any PR and view its diff within VS Code

### In-Editor PR Navigation (Phase 2.1)

- [x] **NAV-01**: Clicking a PR in the sidebar expands it to show its list of changed files (not opens a browser)
- [x] **NAV-02**: Clicking a changed file opens a VS Code diff editor with before/after content from the GitHub API

### Sidebar UI (Phase 2.2)

- [x] **UI-01**: Each PR tree item has an inline "View Review" button that opens the ReviewPanel for that PR's stored review
- [ ] **UI-02**: The sidebar title bar has a "View Project Analysis" button that opens the stored project analysis
- [ ] **UI-03**: The sidebar title bar has a "View PR History Analysis" button that opens the stored PR history analysis
- [ ] **UI-04**: The sidebar title bar has a "Settings" button that opens VS Code settings filtered to the `easyReview.*` namespace

### Project Analysis

- [x] **PROJ-01**: User can run a one-time project analysis that collects README, key source files, and architecture map as persistent context for future reviews
- [x] **PROJ-02**: User can trigger a bulk analysis of past PRs (last 100) to build historical codebase context
- [x] **PROJ-03**: Project analysis results are stored in SQLite and reused across all subsequent review sessions without re-running

### AI Review Generation

- [x] **REV-01**: User can trigger AI review generation for any PR (open, closed, or merged) with a single command
- [x] **REV-02**: Generated review follows the 6-section structured format: Executive Summary, Categorized Changes, Key Code Changes with before/after snippets, Findings by severity, Impact Analysis, Mermaid diagram
- [x] **REV-03**: Review generation streams real-time progress output to the webview panel during the 30–120 second CLI run
- [x] **REV-04**: Generated review is automatically persisted to SQLite on completion
- [x] **REV-05**: User can re-generate a review for the same PR; new review is appended with timestamp alongside prior versions

### Review Display

- [x] **VIEW-01**: Completed review is displayed in a dedicated VS Code webview panel with the full 6-section structured format
- [x] **VIEW-02**: Webview displays findings classified by severity (critical / warning / suggestion)
- [x] **VIEW-03**: User can view review history for any PR (all previously generated reviews)

### Storage

- [x] **DB-01**: All generated content — PR data, reviews, comments, project analyses, MCP context snapshots — is stored in a local SQLite database
- [x] **DB-02**: Extension shows a clear, actionable error if SQLite fails to initialize (e.g., native module ABI mismatch)

### Configuration

- [x] **CFG-01**: User can configure the path to the `claude` CLI executable in VS Code settings
- [x] **CFG-02**: Extension shows a clear setup notification on first activation if `claude` CLI is not found in PATH

### Privanote Integration

- [ ] **PRIV-01**: Extension queries Privanote MCP server for relevant notes context before generating a review
- [ ] **PRIV-02**: Review generation succeeds and produces full output even when the Privanote MCP server is unavailable (graceful degradation)
- [ ] **PRIV-03**: User can send a completed review (full AI analysis + all generated content) to Privanote as a new note via REST API
- [ ] **PRIV-04**: Privanote API token is stored in VS Code SecretStorage (never in globalState or settings)

### GitHub Comment Posting

- [ ] **GH-01**: User can post stored review comments to GitHub as a PR review from within the VS Code webview
- [ ] **GH-02**: Extension requires explicit user confirmation before posting any content to GitHub

## v2 Requirements

### Dual-Model Reviews

- **DUAL-01**: User can generate a review using Codex CLI as an alternative to Claude CLI
- **DUAL-02**: User can compare Claude and Codex reviews side-by-side in the webview

### Review Polish

- **POL-01**: Mermaid diagrams in reviews are rendered visually in the webview (Phase 2 generates the content; Phase 5 renders it)
- **POL-02**: User can search across all stored reviews by PR title, finding, or keyword

### Distribution

- **DIST-01**: Extension is published to the VS Code Marketplace with per-platform builds for macOS arm64/x64, Windows x64, Linux x64

## Out of Scope

| Feature | Reason |
|---------|--------|
| API key management in extension | CLI subprocess model eliminates this — users authenticate through their existing CLI installations |
| Automatic review posting without confirmation | Trust-destroying; always an explicit user action |
| Real-time / always-on background review | On-demand only — avoids runaway CLI subprocess costs |
| Team collaboration / shared reviews | Personal tool first; not a team platform in v1 |
| Auto-apply AI suggestions as code edits | User applies changes manually; out of scope to avoid accidents |
| Prisma ORM | Requires separate query engine binary; incompatible with VS Code extension packaging |
| webpack | Upstream migrated to esbuild; do not reintroduce |
| ESM modules | VS Code extension host requires CommonJS; ESM breaks activation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRW-01 | Phase 1 | Complete |
| PRW-02 | Phase 1 | Complete (browser-open stub); Phase 2.1 upgrades to in-editor diff |
| NAV-01 | Phase 2.1 | Complete |
| NAV-02 | Phase 2.1 | Complete |
| UI-01 | Phase 2.2 | Complete |
| UI-02 | Phase 2.2 | Pending |
| UI-03 | Phase 2.2 | Pending |
| UI-04 | Phase 2.2 | Pending |
| DB-01 | Phase 1 | Complete |
| DB-02 | Phase 1 | Complete |
| CFG-01 | Phase 1 | Complete |
| CFG-02 | Phase 1 | Complete |
| REV-01 | Phase 2 | Complete |
| REV-02 | Phase 2 | Complete |
| REV-03 | Phase 2 | Complete |
| REV-04 | Phase 2 | Complete |
| REV-05 | Phase 2 | Complete |
| VIEW-01 | Phase 2 | Complete |
| VIEW-02 | Phase 2 | Complete |
| VIEW-03 | Phase 2 | Complete |
| PROJ-01 | Phase 2 | Complete |
| PROJ-02 | Phase 2 | Complete |
| PROJ-03 | Phase 2 | Complete |
| PRIV-01 | Phase 3 | Pending |
| PRIV-02 | Phase 3 | Pending |
| PRIV-03 | Phase 3 | Pending |
| PRIV-04 | Phase 3 | Pending |
| GH-01 | Phase 4 | Pending |
| GH-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after roadmap creation — traceability confirmed*
