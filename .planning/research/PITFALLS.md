# Domain Pitfalls

**Domain:** VS Code extension — fork of vscode-pull-request-github with AI review generation
**Researched:** 2026-04-03
**Confidence:** MEDIUM (training data through August 2025; WebSearch/WebFetch unavailable for live verification)

---

## Critical Pitfalls

Mistakes that cause rewrites, blocked Marketplace submissions, or major architectural changes.

---

### Pitfall 1: Upstream Fork Divergence Becomes Unmanageable

**Severity:** BLOCKING

**What goes wrong:** You fork vscode-pull-request-github, make significant changes, and then upstream ships a security fix or a GitHub API update. Merging upstream changes becomes a multi-day conflict resolution exercise. After 2-3 upstream merges, the fork diverges so far that cherry-picking stops working and you must manually reconstruct changes.

**Why it happens:** The upstream extension has ~150 files, a complex webview layer, and React components tightly coupled to internal state. Any feature that touches the PR tree provider, the auth layer, or the webview communication protocol will collide with upstream changes. Microsoft ships updates regularly — the repo had dozens of commits per month in 2024-2025.

**Consequences:**
- Security vulnerabilities in GitHub auth layer go unpatched
- New GitHub API features (e.g., new PR fields) are unavailable
- Increasing merge debt that accumulates until it blocks a release

**Prevention:**
1. Treat upstream as an immutable dependency, not a base to hack on. Keep all Easy Review code in clearly namespaced files: `src/easy-review/` not scattered through `src/`.
2. Define a minimal diff policy: touch as few upstream files as possible. Add a `easy-review-diff.md` listing every upstream file modified.
3. Set up a monthly upstream sync workflow (GitHub Action or manual). Sync upstream into a `upstream-sync` branch and review before merging.
4. Add closed/merged PR support via extension points (new tree provider alongside, not replacing) rather than modifying the existing provider.

**Detection:** The merge conflict count on your upstream sync branch grows beyond 10 files. Treat this as a red alert.

**Timeline:** Relevant from Day 1 (architecture decision). Bites hardest at Month 2+ when upstream ships updates.

---

### Pitfall 2: Native Module (better-sqlite3) Fails in VS Code Extension Host

**Severity:** BLOCKING

**What goes wrong:** `better-sqlite3` is a native Node.js addon (`.node` file compiled against a specific Node ABI). The extension host in VS Code runs a specific Node.js version that may differ from your development machine. When the ABI versions don't match, the addon throws `Error: The module was compiled against a different Node.js version` and the extension fails to activate.

**Why it happens:** VS Code ships its own Node.js runtime. The version changes with each VS Code release. `better-sqlite3` must be compiled against the exact ABI of that runtime. The standard `npm install` compiles against your machine's system Node, not VS Code's Node.

**Consequences:**
- Extension silently fails to activate with a cryptic native module error
- Marketplace submission may fail or produce user bug reports
- Remote extensions (SSH, Codespaces) fail entirely — native binaries for the remote platform won't be bundled

**Prevention:**
1. Use `@vscode/sqlite3` (VS Code's own SQLite wrapper, if available) or investigate `sql.js` (pure WASM, no native compilation). As of 2025, `sql.js` is the recommended fallback for extensions that must avoid native modules.
2. If sticking with `better-sqlite3`: use `electron-rebuild` (or `@electron/rebuild`) during packaging, targeting the exact Electron/Node version VS Code ships. The command is: `electron-rebuild -f -w better-sqlite3 --version <electron-version>`.
3. Pin `engines.vscode` in `package.json` and rebuild native modules when that version changes.
4. Add an activation health check: if the SQLite module fails to load, show an actionable error notification rather than silently dying.
5. Consider abstracting the storage layer behind an interface so you can swap implementations (sql.js for remote/CI, better-sqlite3 for local).

**Detection:** Run `node -e "require('./node_modules/better-sqlite3')"` using VS Code's own Node binary (found at `process.execPath` in extension context) and compare to system node.

**Timeline:** First encountered in Phase 1 when wiring up the database. Resurfaces every time VS Code ships an Electron update.

---

### Pitfall 3: VS Code Marketplace Rejects Extension with Native Modules

**Severity:** BLOCKING (for public distribution)

**What goes wrong:** The Marketplace packaging tool (`vsce`) will include the `.node` binary compiled for your development machine's platform. Users on Windows will download a macOS-compiled binary that won't load. Platform-specific `vsix` files are required, but `vsce` doesn't handle multi-platform native module packaging automatically.

**Why it happens:** `vsce package` bundles whatever is in `node_modules`. It has no concept of platform-specific native binaries unless you explicitly exclude and re-add them.

**Consequences:**
- Single `vsix` that works on macOS and crashes on Windows/Linux
- Marketplace requires separate per-platform packages (`--target win32-x64`, etc.) when native modules are involved
- CI/CD complexity: need macOS, Windows, and Linux build agents to produce all packages

**Prevention:**
1. This is a strong argument for `sql.js` (WASM) over `better-sqlite3`. No native binary = single universal `vsix`.
2. If native modules are required: use GitHub Actions matrix builds targeting `win32-x64`, `darwin-x64`, `darwin-arm64`, `linux-x64`. Each produces its own `vsix`. The `vsce publish --target` flag handles this.
3. Add `.vscodeignore` entries to exclude `node_modules/better-sqlite3/build/Release/*.node` from the base package and only include the platform-correct one in each platform build.

**Timeline:** Relevant only when preparing Marketplace submission (late in the project). But the architectural choice (native vs. WASM SQLite) must be made in Phase 1.

---

### Pitfall 4: Subprocess PATH Does Not Contain `claude` or `codex`

**Severity:** BLOCKING (for core feature)

**What goes wrong:** VS Code on macOS does not source the user's shell profile when launching the extension host. `process.env.PATH` inside the extension is the system PATH (`/usr/bin:/bin:/usr/sbin:/sbin`), not the shell PATH that includes `/usr/local/bin`, `~/.nvm/versions/node/.../bin`, or wherever `claude` and `codex` are installed. `child_process.spawn('claude', ...)` throws `ENOENT`.

**Why it happens:** macOS launches GUI apps with a minimal environment. VS Code inherits this. Even though `claude` works fine in your terminal, it's installed somewhere only your shell knows about.

**Consequences:**
- Core feature (AI review generation) fails for every user whose `claude`/`codex` is in a non-system PATH location (which is nearly everyone who installed via `npm install -g`, `brew`, `pyenv`, `mise`, etc.)

**Prevention:**
1. Resolve the shell PATH at activation time using `shell -i -c 'echo $PATH'` or the well-tested `shell-env` npm package. Cache the result.
2. Use `child_process.spawn` with the `shell: true` option as a fallback (spawns through the user's default shell, picks up PATH). This works but is less portable.
3. Allow the user to configure absolute paths in VS Code settings: `easyReview.claudePath` and `easyReview.codexPath`. This is the escape hatch when automatic detection fails.
4. At activation, run a path detection sequence: (a) check settings, (b) try `shell-env` lookup, (c) try common locations (`/usr/local/bin`, `/opt/homebrew/bin`). Show clear error if none succeed.
5. Show a one-time setup notification on first activation if CLI tools cannot be found, with a link to configuration docs.

**Timeline:** Day 1 of subprocess implementation. Will burn significant time if not handled upfront.

---

### Pitfall 5: Long-Running Subprocess Blocks Extension Host

**Severity:** BLOCKING (for UX)

**What goes wrong:** `claude` reviewing a large PR diff can take 30-120 seconds. If you call it synchronously or don't handle the process lifecycle carefully, VS Code becomes unresponsive. If the user closes the window or the extension is deactivated, the child process becomes an orphan and continues running in the background, consuming CPU/memory.

**Why it happens:** The extension host is a single-threaded Node.js process. Blocking I/O operations freeze the entire extension. Orphaned processes happen when the parent (VS Code) exits without explicitly killing spawned children.

**Consequences:**
- Extension appears frozen during review generation
- Multiple orphan `claude` processes accumulate across VS Code restarts
- User machine performance degrades

**Prevention:**
1. Always use `child_process.spawn` (not `exec` or `execSync`). Wrap in a cancellable promise that calls `childProcess.kill()` on cancellation.
2. Show VS Code progress notification (`vscode.window.withProgress`) for the duration of the subprocess call.
3. Register a process handle in extension context. In the `deactivate()` hook, kill all running child processes: `context.subscriptions.push({ dispose: () => childProcess.kill() })`.
4. Implement a timeout (configurable, default 5 minutes). If exceeded, kill the process and surface an error.
5. Stream stdout/stderr incrementally using the process's `stdout` `data` event — don't buffer the entire output before processing. This prevents memory issues on large reviews.

**Timeline:** Phase 1 subprocess implementation. UX refinement in later phases.

---

## Moderate Pitfalls

Issues that cause significant debugging time or feature limitations, but don't block the project.

---

### Pitfall 6: GitHub Auth Session Stolen by Fork Conflicts with Upstream

**Severity:** ANNOYING

**What goes wrong:** The upstream extension registers a GitHub authentication provider with VS Code's `vscode.authentication` API using a specific provider ID and OAuth scopes. If your fork modifies these registrations (different scopes, different provider ID), VS Code may prompt the user for re-authentication or maintain two conflicting sessions. If both the original Microsoft extension and your fork are installed simultaneously, they will conflict over the same auth provider ID.

**Why it happens:** VS Code's authentication API uses provider IDs as global identifiers. Two extensions registering the same provider ID cause undefined behavior. The Microsoft extension (`vscode.github`) is a built-in extension that may always be present.

**Prevention:**
1. Do not reinstall or replace the existing `vscode.github` authentication provider. Consume it: use `vscode.authentication.getSession('github', scopes)` to obtain tokens from the existing provider rather than registering your own.
2. If you need additional OAuth scopes (e.g., for posting comments), request them incrementally via `getSession` with `createIfNone: true` — VS Code will add scopes to the existing session.
3. Document that this extension should not be used alongside the original Microsoft GitHub PR extension (install one or the other).

**Timeline:** Phase 1 (fork setup). Test early by installing your extension alongside the Microsoft one.

---

### Pitfall 7: Webview Content Security Policy Blocks External Resources

**Severity:** ANNOYING

**What goes wrong:** VS Code webviews enforce a strict Content Security Policy. By default, loading external images, fonts, or scripts from the internet is blocked. Any webview that tries to render a GitHub avatar, load a CDN-hosted React bundle, or fetch data from an external API will silently fail or throw a CSP error.

**Why it happens:** The VS Code webview sandbox is intentional — it prevents extensions from exfiltrating user data. The `webview.options.enableScripts` flag is required to run any JavaScript at all.

**Consequences:**
- GitHub avatar images won't render
- Any external CSS/font CDN links will be blocked
- XHR/fetch calls to GitHub API or Privanote API from within webview context will fail (they must go through the extension host via message passing)

**Prevention:**
1. All assets (icons, fonts, CSS) must be bundled with the extension and served via `webview.asWebviewUri()` — not loaded from CDN.
2. All API calls (GitHub, Privanote) must happen in the extension host, not the webview. Use `webview.postMessage` / `onDidReceiveMessage` for bidirectional communication.
3. Set `<meta http-equiv="Content-Security-Policy">` explicitly in webview HTML, only allowing `vscode-resource:` scheme sources.
4. GitHub avatars: proxy through extension host (fetch in TypeScript, convert to data URI, send to webview via postMessage).

**Timeline:** Webview development phase. Catching this early saves hours of "why isn't this loading" debugging.

---

### Pitfall 8: MCP Client Connection Lifecycle is Fragile

**Severity:** ANNOYING

**What goes wrong:** MCP (Model Context Protocol) uses stdio transport when connecting to a local server. The connection is stateful: once the stdio pipe closes (server crash, timeout, user action), the client must reconnect. The MCP TypeScript SDK does not automatically reconnect. If your extension calls MCP tools after a disconnection, the calls fail with opaque errors.

**Why it happens:** MCP over stdio ties the client lifetime to the server process lifetime. The Privanote MCP server may restart, crash, or not be running when the extension activates.

**Consequences:**
- Review generation silently skips context from Privanote notes
- Error messages are low-level protocol errors, not user-friendly

**Prevention:**
1. Wrap all MCP tool calls in a connection health check. If the connection is not alive, attempt one reconnect before proceeding.
2. Make Privanote MCP context strictly optional: if the MCP server is unavailable, generate the review without that context and log a warning (not an error).
3. Implement exponential backoff reconnection with a max of 3 attempts. After failure, surface a VS Code status bar indicator ("Privanote: disconnected") and a one-click reconnect command.
4. Use a timeout on all MCP tool calls (e.g., 10 seconds). A hung MCP call should not block the entire review generation pipeline.
5. On extension deactivate, cleanly close the MCP connection: `client.close()`.

**Timeline:** MCP integration phase. Design the optional-fallback pattern before writing any MCP code.

---

### Pitfall 9: GitHub API Pagination for Large PR History Causes Rate Limit Exhaustion

**Severity:** ANNOYING

**What goes wrong:** Fetching all closed/merged PRs for a repository with years of history means hundreds of paginated API calls (100 results per page). At the REST API limit of 5,000 requests/hour for authenticated users, fetching 10,000 historical PRs requires 100 API calls just for the list — before fetching diffs, comments, and review data. The one-time "project analysis" phase that collects past PRs is the most dangerous.

**Why it happens:** GitHub's API enforces per-token rate limits. The `X-RateLimit-Remaining` header drops quickly during bulk fetches. Using the GraphQL API reduces round trips but introduces query complexity limits (nodes per request).

**Consequences:**
- Initial project analysis silently stops mid-fetch
- User sees incomplete analysis with no explanation
- Re-running analysis wastes API quota on already-fetched data

**Prevention:**
1. Always check `X-RateLimit-Remaining` and `X-RateLimit-Reset` before paginated requests. Implement adaptive throttling: if remaining < 100, wait until reset.
2. Persist fetched PR data to SQLite immediately (not after full fetch completes). Support resumable fetches: track the last fetched page/cursor.
3. For the one-time project analysis, limit default scope to last 100 PRs (configurable). Don't fetch all time unless explicitly requested.
4. Prefer GraphQL over REST for multi-field PR data — one GraphQL query can return PR + comments + reviews in a single request.
5. Consider using conditional requests (`If-None-Match` with ETags) for PR data that changes infrequently (closed/merged PRs don't change).

**Timeline:** Project analysis feature. Build the rate-limit-aware fetcher from the start — retrofitting is painful.

---

### Pitfall 10: SQLite Database Corruption on Extension Host Crash

**Severity:** ANNOYING

**What goes wrong:** The extension host can be killed mid-write (VS Code crash, OS-level kill, development reload). SQLite's WAL mode provides crash safety for individual transactions, but if you're not wrapping multi-table writes in explicit transactions, partial writes will leave the database in an inconsistent state.

**Why it happens:** Extensions frequently call `saveReview()`, `saveComment()`, etc. as separate database calls without wrapping them in a transaction. A crash between two related writes corrupts the logical consistency.

**Prevention:**
1. Use SQLite WAL mode (`PRAGMA journal_mode=WAL`) — always. This is the single most important SQLite configuration for extensions.
2. Wrap all logically related writes in explicit transactions: `BEGIN; INSERT ...; INSERT ...; COMMIT;` — not individual statements.
3. Run `PRAGMA integrity_check` at startup and log the result. If corruption is detected, offer to reset the database.
4. Keep a schema version table and run migrations on first use of a new version. Never alter schema without a migration.
5. Store the SQLite file in `context.globalStorageUri.fsPath` — the VS Code-managed directory that persists across extension updates.

**Timeline:** Phase 1 (database setup). WAL mode and transaction discipline must be established before writing any data access code.

---

### Pitfall 11: Output Streaming from `claude` CLI Does Not Arrive in Expected Format

**Severity:** ANNOYING

**What goes wrong:** The `claude` CLI (Anthropic's CLI tool) may output structured JSON when passed `--output-format json` or may stream newline-delimited JSON events. If your extension buffers all stdout and then tries to parse it as a single JSON object, it will fail when the CLI streams incremental chunks or writes progress messages to stderr intermixed with stdout.

**Why it happens:** CLI tools designed for terminal use often mix progress/status output with structured output. The output format may change between CLI versions.

**Prevention:**
1. Test the exact output format of `claude` and `codex` with `--help` and known inputs before building the parsing layer.
2. Separate stdout and stderr processing: only parse stdout for structured output; log stderr for debugging.
3. Implement a line-buffered parser that processes each line as it arrives rather than waiting for process exit.
4. Version-pin the `claude` and `codex` CLI in documentation (and ideally in a setup check at activation). If the CLI version changes and output format changes, surface a clear error.
5. Add a raw output fallback: if structured JSON parsing fails, treat the entire stdout as a markdown review string.

**Timeline:** Phase 1 subprocess integration.

---

## Minor Pitfalls

Annoying but easy to fix once identified.

---

### Pitfall 12: Extension Activation Too Slow on Large Repositories

**Severity:** MINOR

**What goes wrong:** Performing any database query, file read, or network call in the synchronous activation path delays VS Code's "Extension Host Ready" signal. VS Code shows a warning for extensions that take more than 5 seconds to activate.

**Prevention:**
1. Keep the synchronous activation path to a minimum: register commands, providers, and subscriptions only. Defer all heavy initialization (database open, auth token fetch, MCP connection) to first use.
2. Use `context.subscriptions.push(vscode.commands.registerCommand(...))` patterns — commands are lazy.
3. Open the SQLite connection lazily on first query, not in `activate()`.

**Timeline:** Becomes relevant during performance testing, typically late in Phase 1.

---

### Pitfall 13: `vsce package` Includes Dev Dependencies or Source Maps in Production Bundle

**Severity:** MINOR

**What goes wrong:** Without a proper `.vscodeignore` file, `vsce` bundles `node_modules`, test files, `.ts` source files, and source maps into the `.vsix`. The resulting package can be 50-200MB — Marketplace has a 100MB limit and rejects oversized packages.

**Prevention:**
1. Use webpack or esbuild to produce a single `dist/extension.js` bundle. `.vscodeignore` should exclude `src/`, `node_modules/`, `*.ts`, and `*.map`.
2. Check bundle size with `vsce ls` before submission to verify what will be included.
3. Target `"main": "./dist/extension.js"` in `package.json`, not `./out/extension.js` (the unbundled TypeScript output).

**Timeline:** Pre-Marketplace submission, but configure the build pipeline in Phase 1 to avoid late surprises.

---

### Pitfall 14: Diff View Modifications Break When Upstream Webview Protocol Changes

**Severity:** MINOR (for fork maintenance)

**What goes wrong:** The upstream extension's webview communicates with the extension host via a typed message protocol defined in `src/common/` files. If you add message types or modify message handlers in the webview, and upstream renames or reorders the existing message types, your changes silently break.

**Prevention:**
1. Do not modify existing message types. Add new message types in a separate namespace (`EasyReviewMessage` vs. `IRequestMessage`).
2. Add a schema version check to the webview bootstrap: validate that the protocol version in the webview matches what the extension host expects.

**Timeline:** Relevant during any webview development phase and each upstream sync.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Fork setup & project scaffold | Upstream divergence strategy not established from day 1 | Define minimal-diff policy and upstream sync workflow before writing code |
| Database schema design | Native module (better-sqlite3) fails in extension host | Decide sql.js vs. better-sqlite3 before writing any DB code; test in VS Code context immediately |
| Subprocess integration | PATH not found for `claude`/`codex` | Implement shell-env detection + settings fallback as the very first thing |
| Subprocess integration | Orphan processes on extension deactivate | Register process handles in `context.subscriptions` from the start |
| GitHub data fetching | Rate limit exhaustion during project analysis | Build resumable, rate-aware fetcher; limit default scope to last 100 PRs |
| MCP client integration | Connection drop breaks review generation | Make MCP context optional before writing MCP code |
| Webview development | CSP blocks API calls and external resources | All API calls go through extension host; no direct network from webview |
| Auth layer | Fork conflicts with built-in `vscode.github` provider | Consume existing session; never register a competing auth provider |
| Marketplace packaging | Native modules produce platform-specific builds | Decide on sql.js (universal) vs. multi-platform build pipeline |
| Any phase | SQLite WAL mode and transaction discipline | Configure at database initialization, never retrofit |

---

## Sources

- Knowledge based on VS Code Extension API documentation (training data through August 2025) — MEDIUM confidence
- `better-sqlite3` native module behavior in Electron environments — HIGH confidence (well-established)
- VS Code subprocess PATH resolution issue on macOS — HIGH confidence (extremely common reported issue)
- MCP TypeScript SDK connection lifecycle — MEDIUM confidence (SDK was relatively new as of 2025)
- GitHub REST API rate limits (5,000/hour for authenticated users) — HIGH confidence (stable for years)
- VS Code Marketplace 100MB size limit and platform-specific vsix requirements — MEDIUM confidence (verify with current vsce docs before packaging)
- SQLite WAL mode behavior and crash safety — HIGH confidence (SQLite documentation)

**Note:** WebSearch and WebFetch were unavailable during this research session. Findings for VS Code-specific behaviors (Marketplace limits, current vsce flags, exact MCP SDK APIs) should be verified against current official documentation before implementation.
