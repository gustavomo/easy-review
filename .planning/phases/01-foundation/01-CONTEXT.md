# Phase 1: Foundation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fork microsoft/vscode-pull-request-github, extend PR browsing to all states (open, closed, merged), set up the local SQLite database, and prove the full integration chain by invoking the `claude` CLI with streaming output. No structured review format yet — Phase 1 exists to validate that every layer works together before Phase 2 adds feature complexity.

</domain>

<decisions>
## Implementation Decisions

### Fork Strategy
- **D-01:** Full fork of `microsoft/vscode-pull-request-github` — keep git history, inherit GitHub auth, Octokit client, PR tree, and diff views
- **D-02:** Strict minimal-diff policy: all new code lives in `src/ai/`, `src/storage/`, `src/mcp/` (new top-level dirs). Never modify `PullRequestManager`, `GitHubRepository`, or auth layers — extend via composition
- **D-03:** Maintain an `easy-review-diff.md` listing every upstream file touched to make future upstream merges manageable

### PR List UI
- **D-04:** Flat list with state badge — one unified list, each PR shows a colored state badge (open / closed / merged). No grouped tree nodes by state.
- **D-05:** Two load modes in the same list:
  1. **Auto-list**: Extension fetches recent PRs from the connected repo automatically (all states)
  2. **Add by URL**: User can paste a GitHub PR URL to load any specific PR (including PRs from other repos)
- **D-06:** PRs are **persistent** — they stay in the sidebar and SQLite until explicitly removed by the user
- **D-07:** Removal **deletes all data** — the PR record and all associated generated content (reviews, comments, analysis) are permanently deleted from SQLite on removal

### SQLite Driver
- **D-08:** Use `better-sqlite3` (native, sync API, WAL mode)
- **D-09:** Build pipeline must include `electron-rebuild` targeting VS Code's Electron version. This is validated as the first technical spike before any feature code
- **D-10:** Abstract storage behind a `StorageAdapter` interface from day one so `sql.js` can be swapped in as emergency fallback if native module packaging fails for a platform
- **D-11:** Initialize DB with `PRAGMA journal_mode=WAL` and `PRAGMA integrity_check` on every extension activation

### CLI Integration (Streaming from Day 1)
- **D-12:** Use `child_process.spawn` with stdout streaming — NOT `exec` or `execSync`
- **D-13:** Phase 1 streams output to VS Code's **Output Channel** (not the webview — that's Phase 2). The streaming infrastructure (subprocess lifecycle, cancellation token, timeout) is production-quality now so Phase 2 only reconnects the stream to the webview
- **D-14:** Hard timeout: 5 minutes per CLI call. Register all spawned process handles in `context.subscriptions`. Implement `deactivate()` hook that kills all running processes
- **D-15:** PATH resolution order: (1) `easyReview.claudePath` user setting, (2) shell-env detection via `shell -i -c 'which claude'`, (3) common locations (`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`). Show clear setup notification on first activation if none found

### Build Pipeline
- **D-16:** Two separate build targets: `esbuild` for extension host (CommonJS, `vscode` and `better-sqlite3` externalized), `Vite` for webview (browser bundle). Shared types live in `src/shared/`
- **D-17:** Stay on CommonJS — no ESM. VS Code extension host requires CJS

### Claude's Discretion
- Exact `electron-rebuild` version pinning (verify against current VS Code Electron at implementation time)
- SQLite schema details beyond what's needed for Phase 1 (PRs + basic metadata)
- Specific VS Code notification/badge styling for state badges
- Output Channel formatting for streamed CLI output

</decisions>

<specifics>
## Specific Ideas

- The existing `pr-analysis` service at `./../privanote/apps/pr-analysis` uses a 6-section structured review format (Executive Summary → Categorized Changes → Key Code Changes → Findings by severity → Impact Analysis → Mermaid diagram) — this defines the review contract that Phase 2 will implement. Phase 1 doesn't need to implement this but the prompt template should be designed with this in mind
- PR state badge colors should follow GitHub conventions: green (open), purple (merged), red (closed)
- "Add PR by URL" supports cross-repo PRs — the PR doesn't need to be from the currently open workspace repo

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — v1 requirements, Phase 1 requirement IDs: PRW-01, PRW-02, DB-01, DB-02, CFG-01, CFG-02
- `.planning/research/SUMMARY.md` — Synthesized research: stack decisions, critical pitfalls, critical path order
- `.planning/research/STACK.md` — Full stack with versions and rationale
- `.planning/research/ARCHITECTURE.md` — Component boundaries, SQLite schema, webview messaging patterns
- `.planning/research/PITFALLS.md` — 14 pitfalls with mitigations (native module ABI, PATH, fork divergence are the top 3)

### Upstream fork
- No local copy yet — agent must reference `microsoft/vscode-pull-request-github` on GitHub for current class names (`PullRequestManager`, `FolderRepositoryManager`, tree provider names). Verify at fork time.

### No external specs beyond project planning artifacts
All implementation constraints are captured in decisions above and research files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing codebase in this repo yet — this is a greenfield fork setup

### Integration Points
- New code integrates with the upstream fork's `PullRequestManager` (PR data access) and `TreeDataProvider` (sidebar tree) — read upstream source at fork time to understand exact API before planning tasks

</code_context>

<deferred>
## Deferred Ideas

- Review webview panel UI — Phase 2
- Streaming output TO webview — Phase 2 (Phase 1 streams to Output Channel only)
- Structured 6-section review format — Phase 2
- Privanote MCP integration — Phase 3
- GitHub comment posting — Phase 4

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-03*
