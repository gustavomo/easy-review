# Project Research Summary

**Project:** Easy Review
**Domain:** VS Code extension — AI-powered code review generation, fork of microsoft/vscode-pull-request-github
**Researched:** 2026-04-03
**Confidence:** MEDIUM (training data through Aug 2025; no live web verification available)

---

## Executive Summary

Easy Review is a TypeScript VS Code extension built by forking microsoft/vscode-pull-request-github and adding an AI review generation layer on top. The fork gives you battle-tested GitHub auth, PR tree navigation, and diff views for free — the new work is confined to four independent subsystems: a SQLite persistence layer, an AI orchestration layer (subprocess management), a Privanote MCP client, and a new React webview panel. This clean separation is the core architectural principle: all new code lives in namespaced directories (`src/ai/`, `src/storage/`, `src/mcp/`), touching the upstream as little as possible to make future upstream merges survivable.

The recommended approach is to build the critical path in dependency order: working PR browsing (including closed/merged state) → SQLite store → subprocess runner → prompt builder and review parser → webview display. The AI review quality differentiator — the structured 6-section review format with before/after code analysis and Mermaid diagrams — must be established in the prompt template from day one. This is not a UI problem; it is a prompt engineering problem. The existing `pr-analysis` agent's SYNTHESIS_INSTRUCTION is the proven starting point and should be directly translated into the CLI prompt template in Phase 1.

The highest-severity risks all cluster around Phase 1. Native module (better-sqlite3) ABI mismatch can silently kill the extension at activation. The `claude`/`codex` CLIs will not be found in PATH when VS Code is launched from the Dock on macOS. And fork divergence from upstream becomes unmanageable within weeks if the minimal-diff policy is not established before the first line of feature code. All three must be resolved as prerequisites, not retrofits.

---

## Critical Decisions

These choices must be made before Phase 1 feature work begins. Deferring them causes rewrites.

| Decision | Options | Recommendation | Consequence of Wrong Choice |
|----------|---------|----------------|----------------------------|
| SQLite driver | `better-sqlite3` (native) vs `sql.js` (WASM) | `better-sqlite3` for ergonomics; accept the rebuild complexity | Native ABI mismatch silently blocks activation; choosing WASM limits to in-memory storage unless manually serialized |
| Marketplace distribution model | Universal `.vsix` vs per-platform `.vsix` | If `better-sqlite3`: per-platform builds; if `sql.js`: single universal build | Shipping macOS-compiled native binary to Windows users fails silently |
| PATH resolution strategy | Shell-env detection vs user-configured paths vs `shell: true` spawn | Implement all three in priority order (settings → shell-env → common paths) | Core AI generation feature fails on nearly every install |
| Upstream minimal-diff policy | Modify upstream files freely vs strict namespace isolation | Strict: all new code in `src/easy-review/` or new top-level dirs | Upstream merges become multi-day conflict resolution within 2 months |
| ESM vs CommonJS | ESM modules vs CommonJS | Stay on CommonJS | VS Code extension host requires CJS; ESM breaks activation |

---

## Key Findings

### Recommended Stack

The upstream fork is TypeScript + CommonJS + esbuild, and the new code must stay compatible. The extension host requires CommonJS (not ESM) — this is non-negotiable as of VS Code 1.96. The webview gets its own build target (Vite + React 18) that is separate from the extension host bundle. Two build targets that share types via a `src/shared/` directory is the canonical VS Code pattern for extensions with webviews.

The most complex stack decision is SQLite. `better-sqlite3` is recommended over `sql.js` because its synchronous API is cleaner for the single-threaded extension host, it supports WAL mode, and it handles real file-based storage without manual serialization. The tradeoff is a mandatory electron-rebuild step that must target VS Code's embedded Electron version — not system Node. This must be automated in the build pipeline from day one. MCP integration uses `@modelcontextprotocol/sdk` with stdio transport (spawn the Privanote MCP server as a subprocess). All HTTP calls to external APIs use Node's built-in `fetch` — no axios, no got, no node-fetch (all have ESM or bundle-size issues in this context).

**Core technologies:**
- TypeScript 5.4+ / Node 20 (Electron-hosted): primary language — fork requires it; `@types/node` must match VS Code's embedded Node version, not system Node
- `better-sqlite3` + `electron-rebuild`: SQLite persistence — sync API fits extension host; must rebuild for VS Code's Electron ABI on every VS Code version bump
- `drizzle-orm` or raw SQL: schema management — start with raw SQL; add Drizzle only if schema complexity exceeds ~8 tables
- `child_process.spawn` (built-in): AI CLI subprocess runner — streaming output required; never `exec` or `execSync` for long-running AI calls
- React 18 + Vite 5 + `@vscode/webview-ui-toolkit`: webview UI — upstream already uses React; the toolkit provides VS Code-themed components and eliminates theme-matching work
- `@modelcontextprotocol/sdk` ^1.x: Privanote MCP client — official SDK; use stdio transport for local server
- Node built-in `fetch`: Privanote REST API calls — available in Node 18+; no external HTTP library needed
- esbuild: extension host bundler — inherited from upstream; `vscode` and `better-sqlite3` must be in `external`

**What NOT to use:** Prisma (requires separate query engine binary), webpack (upstream migrated away), `sql.js` (in-memory only), async SQLite drivers, `node-fetch` v3 / `got` v12+ (ESM-only), axios (bundle weight), ESM modules, `retainContextWhenHidden: true` on webviews.

### Expected Features

The differentiating value is not "AI review" in general — it is *context-aware structured review* that references the actual codebase. Generic AI reviews are already free everywhere. The review must follow the 6-section contract (Executive Summary → Categorized Changes → Key Code Changes with before/after snippets → Findings by severity → Impact Analysis → Mermaid diagram) derived directly from the existing `pr-analysis` agent's SYNTHESIS_INSTRUCTION. This structure is the product quality bar and must be enforced via the prompt template.

**Must have (table stakes — MVP is broken without these):**
- PR list covering all states: open, closed, merged — the upstream fork shows only open; this is the first fork modification
- One-click review generation via `claude` CLI subprocess — single model sufficient for MVP
- Structured review output in dedicated webview panel — the 6-section format must be correct from day one, not iterated later
- SQLite persistence — reviews disappearing on window close kills daily use immediately
- Project analysis (one-time codebase context) — without this, reviews are generic; this is the core differentiator and must be in MVP even if the UX is rough
- Progress feedback during 30-120 second CLI runs — streaming subprocess output to the webview

**Should have (differentiators — what makes this worth using over cloud tools):**
- Privanote MCP context injection before review generation — unique capability no cloud tool can match
- Post review to Privanote as a note — closes the PKM loop; makes reviews searchable outside VS Code
- Review history across all PRs — searchable local history not available in cloud tools without subscription
- Severity-classified findings (critical / warning / suggestion) — prompt engineering, low effort
- Re-generate review — append new review with timestamp for the same PR after new commits
- Mermaid diagram rendering in webview — the content goes in the review from day one; rendering can iterate

**Defer to v2+:**
- Dual-CLI strategy (Claude + Codex) — Claude alone is functional; Codex adds complexity without changing the core loop
- Post review as GitHub PR comment — useful but not the core value; implement after review content is solid
- Advanced review history search — SQLite full-text search can be added after the baseline works

**Anti-features (explicitly do not build):**
- API key management in the extension — CLI subprocess model eliminates this entirely
- Automatic review posting without confirmation — always an explicit user action
- Real-time / always-on review — on-demand only
- Team collaboration features — personal tool first
- Auto-apply AI suggestions as code edits — user manually applies

### Architecture Approach

The extension is structured as the upstream fork's layers (GitHub auth, API client, tree providers, comment controller) plus three new self-contained subsystems added without modifying upstream files: `src/ai/` (orchestration, subprocess, prompt building, parsing), `src/storage/` (SQLite), and `src/mcp/` (Privanote client). A new webview panel (`AIReviewPanel`) sits alongside the upstream's PR description panel. The extension host is the single source of truth; the webview is a pure renderer that requests state on load and receives streamed updates during generation.

**Major components:**
1. **Upstream fork layers (kept intact)** — GitHub auth, Octokit API client, PR tree providers, diff views; touched only to extend the PR state filter from open-only to all states
2. **`src/ai/` — AIReviewOrchestrator** — coordinates the full generation pipeline: pull cached project analysis → query Privanote MCP context → assemble prompt → spawn CLI subprocess → stream to webview → parse output → persist to SQLite
3. **`src/storage/` — SQLiteStore** — single class wrapping all DB operations; WAL mode mandatory; schema: repos, project_analyses, pull_requests, reviews, review_comments, mcp_context_snapshots
4. **`src/mcp/` — PrivanoteMCPClient** — connect to Privanote MCP server via stdio transport; strictly optional/lazy; review generation degrades gracefully if MCP is unavailable
5. **`src/webviews/` + `webviews/ai-review/` — AIReviewPanel + React webview** — extension host manages panel lifecycle; webview sends `ready` signal on load and receives state sync; streaming progress during generation then structured review on completion

**Critical path build order:** Fork setup + closed/merged PR browsing → SQLiteStore → SubprocessRunner + CLI integration (highest-risk, prove out first) → PromptBuilder + ReviewParser → AIReviewPanel webview → MCPClient → GitHub comment posting → Privanote API push → Project analysis flow.

### Critical Pitfalls

1. **Upstream fork divergence** — Microsoft ships vscode-pull-request-github with dozens of commits per month. Without a strict minimal-diff policy, upstream merges become multi-day conflicts by month 2. Prevention: all new code in `src/easy-review/` (or namespaced directories); maintain a `easy-review-diff.md` listing every upstream file touched; never modify `PullRequestManager`, `GitHubRepository`, or auth layers directly — use composition.

2. **Native module (better-sqlite3) ABI mismatch** — `npm install` compiles the `.node` binary against system Node; VS Code runs a different Node embedded in Electron. Extension fails to activate with "NODE_MODULE_VERSION mismatch". Prevention: `electron-rebuild` in the build pipeline targeting VS Code's Electron version; health check on activation that shows an actionable error if SQLite fails to load; abstract storage layer behind an interface so `sql.js` can be swapped in as a fallback.

3. **PATH does not contain `claude` or `codex`** — VS Code launched from macOS Dock inherits minimal system PATH; `child_process.spawn('claude', ...)` throws `ENOENT` for virtually every user. Prevention: at activation, detect PATH via `shell -i -c 'echo $PATH'`; fall back to `easyReview.claudePath` setting; check common locations (`/opt/homebrew/bin`, `/usr/local/bin`); show clear setup notification on first activation if detection fails.

4. **Orphaned CLI subprocesses** — 30-120 second `claude` calls become orphan processes if VS Code closes without killing them. Prevention: register every spawned process handle in `context.subscriptions`; implement `deactivate()` hook that kills all running processes; always use `vscode.window.withProgress` with a `CancellationToken`; hard timeout at 5 minutes.

5. **SQLite corruption from untransacted multi-table writes** — partial writes on crash leave the database logically inconsistent. Prevention: WAL mode (`PRAGMA journal_mode=WAL`) is mandatory and must be set at database initialization, never retrofitted; all logically related writes wrapped in explicit transactions; `PRAGMA integrity_check` on startup.

---

## Implications for Roadmap

### Phase 1: Foundation — Fork Setup, PR Browsing, and Core Infrastructure

**Rationale:** Everything downstream depends on having working PR data from the fork and a functioning SQLite store. This phase also resolves all three blocking prerequisites (native module, PATH resolution, minimal-diff policy) before any feature complexity is added.

**Delivers:** A working VS Code extension that browses PRs in all states (open/closed/merged), stores PR snapshots in SQLite, and can invoke `claude` CLI for a basic (unstructured) review. The review quality contract is not yet enforced, but the full integration chain is proven.

**Addresses:**
- PR list covering all states (table stakes)
- SQLite persistence (table stakes)
- Basic review generation via subprocess (table stakes)
- Progress feedback (table stakes)

**Must resolve as prerequisites before feature work:**
- Decide `better-sqlite3` vs `sql.js` and test in VS Code extension context
- Implement PATH resolution strategy for CLI tools
- Define minimal-diff policy and upstream sync workflow
- Configure two-target build (esbuild for extension host, Vite for webview)
- Configure `.vscodeignore` correctly (native modules, webview assets)

**Avoids:**
- Pitfall 1 (upstream divergence) — establish policy before writing code
- Pitfall 2 (native module ABI) — test and resolve in phase 1, not phase 3
- Pitfall 4 (PATH resolution) — implement as the first thing in subprocess work
- Pitfall 5 (SQLite corruption) — WAL mode and transaction discipline set up once, here

**Research flag:** This phase needs hands-on validation of `better-sqlite3` + `electron-rebuild` against the current VS Code Electron version. Versions in research are MEDIUM confidence — verify against current VS Code release notes before implementation.

---

### Phase 2: AI Review Generation — The Core Value Loop

**Rationale:** Once the infrastructure is solid, build the complete AI review pipeline end-to-end. The quality contract (6-section structured review format) must be established here — not iterated later. The `pr-analysis` SYNTHESIS_INSTRUCTION is the starting point for the prompt template.

**Delivers:** One-click review generation from any PR in VS Code, with a structured 6-section review displayed in a dedicated webview panel, persisted to SQLite, and streamable in real time during generation. Project analysis (one-time codebase context) included — this is what makes reviews non-generic.

**Addresses:**
- One-click review generation (table stakes)
- Structured review display in webview (table stakes)
- Project analysis / codebase context (primary differentiator)
- Review history (differentiator)
- Severity-classified findings (differentiator — prompt engineering only)
- Re-generate review (differentiator — trivial once pipeline exists)

**Implements:**
- `src/ai/AIReviewOrchestrator`, `SubprocessRunner`, `PromptBuilder`, `ReviewParser`
- `webviews/ai-review/` React webview with `ProgressStream` and `ReviewDisplay` components
- Structured message protocol (`src/shared/webviewProtocol.ts`)
- GitHub rate-limit-aware fetcher for project analysis (Pitfall 9)

**Avoids:**
- Pitfall 11 (CLI output format) — test exact `claude` output format with `--output-format json` before building the parser; implement raw markdown fallback
- Pitfall 7 (webview CSP) — all API calls go through extension host; no direct network from webview

**Research flag:** The exact `claude` and `codex` CLI flags, output formats, and stdin/prompt handling should be verified against the installed CLI versions before building `ReviewParser`. This is empirical — run the CLIs directly and capture output before writing parsing code.

---

### Phase 3: Privanote Integration — Context In, Reviews Out

**Rationale:** With the core review loop solid, add the two-way Privanote integration. MCP context injection and REST API push are independent of each other and can be built in parallel within this phase. Both are additive — the review pipeline degrades gracefully if either is unavailable.

**Delivers:** Reviews enriched with Privanote notes context before generation; completed reviews pushed to Privanote as searchable notes. The MCP connection manager handles server availability failures gracefully.

**Addresses:**
- Privanote MCP context injection (differentiator)
- Post review to Privanote (differentiator)

**Implements:**
- `src/mcp/MCPClient`, `MCPConnectionManager`
- Privanote REST API client (`src/api/privanote.ts`) using built-in `fetch`
- Privanote token storage via VS Code `SecretStorage` API

**Avoids:**
- Pitfall 8 (MCP connection lifecycle) — lazy-connect, optional fallback, timeout on all MCP calls, exponential backoff reconnection
- Never store Privanote API token in `globalState` — `SecretStorage` only

**Research flag:** MCP SDK API shapes are MEDIUM confidence (SDK was actively evolving as of training cutoff). Verify `@modelcontextprotocol/sdk` Client and Transport API against current npm version before writing `MCPClient`.

---

### Phase 4: GitHub Comment Posting and Distribution Prep

**Rationale:** Close the review loop with GitHub comment posting, then prepare for Marketplace distribution. The per-platform build pipeline must be resolved here if `better-sqlite3` is the SQLite choice.

**Delivers:** Post any stored review as a GitHub PR comment from within VS Code (with user confirmation). Extension packaged and tested for Marketplace distribution.

**Addresses:**
- Post review as GitHub PR comment (differentiator)
- Public distribution / Marketplace

**Implements:**
- GitHub REST API `POST /repos/{owner}/{repo}/pulls/{number}/reviews`
- Confirmation step UI in webview (`ActionButtons` component)
- Per-platform `.vsix` builds if `better-sqlite3` is used (GitHub Actions matrix: `darwin-x64`, `darwin-arm64`, `win32-x64`, `linux-x64`)

**Avoids:**
- Pitfall 3 (Marketplace native module packaging) — per-platform builds via `vsce publish --target`
- Pitfall 13 (oversized vsix) — verify `vsce ls` output before submission; Marketplace limit is ~100MB

**Research flag:** Verify current `vsce` platform targets and Marketplace size limits against current official vsce docs before packaging work begins.

---

### Phase 5: Polish and Dual-CLI Strategy (v2)

**Rationale:** Defer until the single-model path is validated in daily use. Dual-model adds orchestration complexity and is not required to prove the core value.

**Delivers:** Codex CLI integration as a second review model; side-by-side or tabbed review comparison; Mermaid diagram rendering in the webview.

**Addresses:**
- Dual-CLI review strategy (Claude + Codex)
- Mermaid diagram rendering (content already generated in Phase 2; rendering is the Phase 5 addition)

**Research flag:** Standard patterns for running two subprocesses and merging results. No deep research needed — extend the existing `SubprocessRunner`.

---

### Phase Ordering Rationale

- Phases 1-2 are strictly ordered by dependency: no AI review without working PR data and SQLite.
- Phase 3 (Privanote) is ordered after Phase 2 because MCP context and API push are additive to a working review — you cannot refine what doesn't exist yet.
- Phase 4 (GitHub posting + distribution) is deferred because review content must be solid before it's published anywhere. Marketplace packaging complexity is also a late concern for a personal tool starting at daily use.
- Phase 5 is deliberately v2 scope — the single-model path must prove the value before doubling the subprocess complexity.

### Research Flags Summary

| Phase | Research Needed? | Reason |
|-------|-----------------|--------|
| Phase 1 | Yes — before starting | `better-sqlite3` + `electron-rebuild` version verification against current VS Code Electron version; test native module in actual VS Code extension context |
| Phase 2 | Yes — before building ReviewParser | Empirical test of `claude`/`codex` exact output format with target flags; version pins for CLI tools |
| Phase 3 | Yes — before building MCPClient | Verify `@modelcontextprotocol/sdk` current API shapes (Client, StdioClientTransport) |
| Phase 4 | Yes — before packaging | Verify current `vsce` platform target flags and Marketplace size/native module policies |
| Phase 5 | No | Extension of existing patterns |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core choices (TypeScript, React, esbuild) are HIGH confidence; `better-sqlite3` + electron-rebuild version matrix and MCP SDK API shapes are MEDIUM — require live verification before implementation |
| Features | HIGH | Review section structure and quality criteria derived directly from the existing `pr-analysis` agent SYNTHESIS_INSTRUCTION; competitive landscape assessment is MEDIUM (no live verification) |
| Architecture | HIGH | VS Code extension API patterns (webview messaging, subprocess management, SecretStorage) are stable and well-documented; upstream fork structure is MEDIUM (training data, may have shifted in minor ways) |
| Pitfalls | HIGH | macOS PATH issue and native module ABI mismatch are extremely well-documented and reproducible; MCP lifecycle pitfalls are MEDIUM (SDK was new as of training cutoff) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`better-sqlite3` + electron-rebuild versions:** Must verify the correct `better-sqlite3` and `@electron/rebuild` versions against the specific VS Code Electron version in the target VS Code release. Do this as the first technical spike, before writing any storage code.
- **`claude` CLI output format:** The exact flags, output format, and streaming behavior of the `claude` CLI must be tested empirically before building `ReviewParser`. Training data on this is MEDIUM confidence at best — the CLI evolves rapidly.
- **`codex` CLI interface:** Same gap as `claude` — verify actual output format before Phase 5.
- **MCP SDK API shapes:** The `@modelcontextprotocol/sdk` Client and Transport API should be verified against the current npm version. The SDK was actively evolving near the research cutoff.
- **VS Code Marketplace native module policies:** Verify current `vsce` documentation on platform-specific packaging before Phase 4. Policies evolve and the 100MB size limit may have changed.
- **Upstream fork current state:** The `microsoft/vscode-pull-request-github` source tree should be audited at fork time to verify the key class names (`PullRequestManager`, `FolderRepositoryManager`, tree provider names) still match what the architecture research describes.

---

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — requirements, constraints, explicit out-of-scope items, key decisions
- `privanote/apps/pr-analysis/src/pr_insight/domain/agent.py` — SYNTHESIS_INSTRUCTION defining canonical review structure (6 sections, quality criteria, before/after example)
- VS Code Extension API (training data, stable patterns) — webview messaging, SecretStorage, CancellationToken, withProgress, TreeDataProvider
- Node.js `child_process` documentation — subprocess management patterns

### Secondary (MEDIUM confidence — verify before implementation)
- microsoft/vscode-pull-request-github source tree (training data, Aug 2025) — component map, key class names, upstream layer structure
- `better-sqlite3` documentation — sync API, WAL mode, electron-rebuild requirement
- `@modelcontextprotocol/sdk` TypeScript SDK — Client, StdioClientTransport patterns
- VS Code Marketplace packaging (`vsce`) — platform-specific vsix, size limits

### Tertiary (LOW confidence — must verify live)
- `better-sqlite3` + `@electron/rebuild` version matrix against current VS Code Electron version
- `claude` and `codex` CLI exact output format and flags (CLI evolves rapidly; test empirically)
- MCP SDK current stable API surface

---

*Research completed: 2026-04-03*
*Ready for roadmap: yes*
