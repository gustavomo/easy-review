# Phase 2: AI Review Generation - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the full AI review pipeline: trigger review generation from the PR tree, stream real-time Claude/Codex CLI output to a webview panel, parse the 6-section structured output, persist reviews to SQLite with full version history, and implement one-time project analysis that injects codebase context into all subsequent reviews. No Privanote integration (Phase 3) and no GitHub comment posting (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Review Trigger
- **D-01:** Review generation is triggered exclusively by right-click context menu on a PR tree item  --  no command palette trigger. Consistent with VS Code conventions and the existing Remove PR right-click action.
- **D-02:** Only one review can be active at a time. If a review is already generating when a second is triggered, queue it  --  run after the current one finishes.
- **D-03:** When re-generating a review for a PR that already has reviews, show a confirmation: "This PR already has N reviews. Generate a new one?" before proceeding.
- **D-04:** A Cancel button is shown in the webview during generation. Clicking cancel kills the CLI process via CancellationToken (SubprocessRunner already supports this). Partial output is discarded and the webview returns to idle state.

### CLI & Prompt
- **D-05:** Both `claude` and `codex` CLIs are supported in Phase 2. User configures which to use via a VS Code setting (`easyReview.activeModel: "claude" | "codex"`). Separate path settings: `easyReview.claudePath` (existing) and `easyReview.codexPath` (new).
- **D-06:** Same SubprocessRunner is used for both CLIs. A per-CLI prompt adapter wraps it with CLI-specific flags and output parsing. Claude uses `--print --verbose --output-format stream-json --include-partial-messages`. Codex flags to be determined empirically at implementation time.
- **D-07:** One shared prompt template drives both CLIs, adapted for each CLI's input syntax. The 6-section structured format is the same output contract for both.
- **D-08:** Prompt content is fixed  --  no user editing before send. Prompt includes: diff + PR title/description + author + commit messages. Full metadata approach for maximum review depth.
- **D-09:** When project analysis exists in SQLite, it is automatically prepended to the review prompt. No user toggle  --  always injected when available.
- **D-10:** The model used (claude or codex) is shown in the review header within the webview.

### Diff Acquisition
- **D-11:** The PR diff is fetched via the GitHub REST API using Octokit (already available from upstream fork). The stored `repo_id` and `pr_number` identify the PR. The GitHub API returns the diff in patch format.

### Streaming Progress Display
- **D-12:** During generation, the webview shows live streaming text  --  output appears in real time as the CLI writes it. Text is auto-scrolled to the bottom as new content arrives.
- **D-13:** Streaming chunks are buffered and sent to the webview every 200ms via postMessage to reduce message channel overhead.
- **D-14:** An elapsed time counter is shown in the webview header during generation (e.g., "Generating... 45s").
- **D-15:** The webview Output Channel is NOT used during review generation. The webview is the sole streaming destination. OutputChannelReporter is repurposed for errors/debug logs only.
- **D-16:** Webview state machine: `idle → generating (streaming) → complete (review) | error`. Three states, clean transitions.
- **D-17:** On generation failure or timeout, the webview transitions to an error state showing the error message and a Retry button. Not just a VS Code notification.
- **D-18:** On cancel, partial output is discarded and webview returns to idle state.

### Webview Panel Layout
- **D-19:** Singleton panel  --  one ReviewPanel instance reused for all PRs. Opening a review for a different PR replaces the current panel content.
- **D-20:** Panel opens in `vscode.ViewColumn.Two` (beside the code editor).
- **D-21:** Panel persists across VS Code restarts  --  on reopen, loads the most recent review for the last-opened PR from SQLite.
- **D-22:** Panel header contains: PR title + model used + timestamp + history version dropdown.
- **D-23:** Completed review is displayed as one scrollable document with collapsible sections (one per of the 6 sections). No tabs.
- **D-24:** Findings section groups by severity with colored labels: critical (VS Code error-red), warning (VS Code warning-yellow), suggestion (VS Code info-blue). Matches VS Code diagnostic conventions.
- **D-25:** Review history is surfaced via a dropdown in the webview header (e.g., "Review 1 (Apr 3)", "Review 2 (Apr 4)"). Selecting switches the displayed review.
- **D-26:** Mermaid diagram (section 6) is rendered as a formatted code block in Phase 2. Visual rendering is deferred (v2 requirement POL-01).
- **D-27:** Webview uses VS Code CSS custom properties for theming (`var(--vscode-editor-background)`, etc.). Supports both light and dark VS Code themes.
- **D-28:** Key Code Changes section displays before/after as side-by-side diff blocks with red/green syntax highlighting.

### SQLite Schema  --  New Tables
- **D-29:** Add `reviews` table (Phase 2 migration): `id`, `repo_id`, `pr_number`, `model_used`, `created_at`, `review_text` (full 6-section raw text), `parsed_json` (structured sections as JSON).
- **D-30:** Add `project_analyses` table: `id`, `collected_at`, `context_text` (concatenated README + src structure + package.json + git log). Single row  --  overwrite on re-run (not versioned).

### Project Analysis (PROJ-01)
- **D-31:** Triggered by explicit manual command: "Easy Review: Analyze Project" in the command palette. Not automatic.
- **D-32:** Collects: README.md content + top-level `src/` directory listing + `package.json` content + last 20 git log entries (title + author + date). Concatenated into a single `context_text` blob.
- **D-33:** During analysis, VS Code's `withProgress` shows a cancellable progress notification in the notification area. Not streamed to the webview.
- **D-34:** On completion, shows a summary notification: "Project analysis complete. Collected: README.md, N source files, M recent commits."
- **D-35:** Re-running analysis overwrites the previous row in `project_analyses`. No versioning.
- **D-36:** No expiry or auto re-run prompt. User re-runs on demand.

### PR History Analysis (PROJ-02)
- **D-37:** Separate command: "Easy Review: Analyze PR History". Fetches last 100 PR titles + descriptions + merge dates via GitHub API (not full diffs  --  too large). Appended to the `project_analyses` context_text as an additional section.

### Claude's Discretion
- Exact Codex CLI flags and output format (research empirically at implementation time  --  see STATE.md blocker note)
- ReviewParser implementation details  --  how to split raw Claude output into 6 sections (regex, markdown heading detection, etc.)
- Exact postMessage protocol shape between extension host and webview
- React component structure within the webview (state management, component split)
- Specific wording of confirmation dialogs and notification messages
- Queue implementation approach (simple sequential promise chain is likely sufficient)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md`  --  Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md`  --  v1 requirements; Phase 2 requirement IDs: REV-01, REV-02, REV-03, REV-04, REV-05, VIEW-01, VIEW-02, VIEW-03, PROJ-01, PROJ-02, PROJ-03
- `.planning/STATE.md`  --  Current progress and critical blocker: "Exact `claude` CLI output format and flags must be tested empirically before building ReviewParser"

### Phase 1 context (decisions that carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md`  --  D-12 through D-17 (streaming infrastructure, build pipeline, CJS requirement)

### Research artifacts
- `.planning/research/SUMMARY.md`  --  Synthesized research: stack decisions, critical pitfalls, critical path order
- `.planning/research/ARCHITECTURE.md`  --  Component boundaries, SQLite schema, webview messaging patterns
- `.planning/research/PITFALLS.md`  --  Critical pitfalls including native module ABI, PATH, fork divergence

### Existing Phase 2 source files (read before modifying)
- `src/easy-review/cli/SubprocessRunner.ts`  --  Existing streaming CLI runner with CancellationToken support
- `src/easy-review/cli/PathResolver.ts`  --  PATH resolution for CLI executables
- `src/easy-review/storage/SQLiteStore.ts`  --  Storage implementation to extend with new tables
- `src/easy-review/storage/schema.ts`  --  Existing `prs` table DDL; Phase 2 adds `reviews` + `project_analyses`
- `src/easy-review/storage/StorageAdapter.ts`  --  Interface to extend with review/analysis CRUD methods
- `src/easy-review/activation.ts`  --  Extension wiring; Phase 2 commands registered here
- `src/migrations.ts`  --  Upstream migration file; check if Phase 2 should add DB migrations here or a separate easy-review-migrations file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SubprocessRunner.ts` → `runClaudeStreaming(claudePath, {prompt, token, outputChannel})`  --  already handles streaming, cancellation, 5-min timeout, stream-json parsing. Phase 2 replaces the `outputChannel` sink with a webview postMessage sender.
- `SQLiteStore.ts`  --  WAL mode, STRICT schema, sync API. Phase 2 adds migrations for `reviews` and `project_analyses` tables.
- `activation.ts`  --  `getStore()` / `getProvider()` module-level exports for command wiring without argument threading.
- `EasyReviewPRsProvider.ts`  --  PR tree items; Phase 2 adds a context menu command registration pointing to `easyReview.generateReview`.
- Vite webview build target  --  already configured in Phase 1 build pipeline. Phase 2 adds the React panel component to the webview bundle.
- No webview React code exists yet  --  building from scratch in the existing Vite target.

### Established Patterns
- Two build targets: esbuild for extension host (CJS), Vite for webview (browser). Keep strictly separate.
- Commands registered in `activation.ts` using `getStore()` / `getProvider()` for access to state.
- Storage adapter interface pattern  --  extend `StorageAdapter` with new review/analysis methods before implementing in `SQLiteStore`.
- STRICT SQLite tables  --  continue using `STRICT` mode for `reviews` and `project_analyses` tables.

### Integration Points
- New `ReviewPanel` (extension host) ↔ `ReviewWebview` (React, Vite bundle) via `vscode.WebviewPanel` postMessage protocol
- `ReviewRunner` wraps `SubprocessRunner` with per-CLI adapters  --  sits in `src/easy-review/cli/`
- `ProjectAnalysisService` reads workspace files + calls GitHub API for PROJ-02 history  --  new service in `src/easy-review/github/`
- GitHub diff fetch via Octokit  --  upstream `CredentialStore` already available through `activation.ts`

</code_context>

<specifics>
## Specific Ideas

- The 6-section structured format is defined in Phase 1 context (from the existing `pr-analysis` service): Executive Summary → Categorized Changes → Key Code Changes (before/after snippets) → Findings by severity → Impact Analysis → Mermaid diagram
- PR state badge colors (established in Phase 1): green (open), purple (merged), red (closed)  --  use same palette in webview severity colors if consistent
- The STATE.md has a critical blocker note: "Exact `claude` CLI output format and flags must be tested empirically before building ReviewParser"  --  this must be the first technical spike in Phase 2 planning
- Phase 1 already shipped `--verbose --output-format stream-json --include-partial-messages` flags (verified against claude 2.1.87). Phase 2 ReviewParser must handle the stream-json event format already documented in SubprocessRunner.ts comments.

</specifics>

<deferred>
## Deferred Ideas

- Mermaid visual rendering  --  v2 requirement POL-01 (Phase 2 shows raw code block)
- Dual-model side-by-side comparison  --  v2 requirement DUAL-02
- Review search across all stored reviews  --  v2 requirement POL-02
- Privanote MCP context injection  --  Phase 3
- Privanote REST API push  --  Phase 3
- GitHub comment posting  --  Phase 4

</deferred>

---

*Phase: 02-ai-review-generation*
*Context gathered: 2026-04-03*
