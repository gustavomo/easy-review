# Phase 2: AI Review Generation - Research

**Researched:** 2026-04-03
**Domain:** VS Code Extension — AI CLI subprocess orchestration, React 16 webview panel, SQLite schema extension, structured output parsing, GitHub diff acquisition via Octokit
**Confidence:** HIGH (codebase is fully readable; Phase 1 infrastructure is in place; all design decisions are locked in 02-CONTEXT.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Review Trigger**
- D-01: Review generation triggered exclusively by right-click context menu on PR tree item. No command palette trigger.
- D-02: Only one review active at a time. Queue second review to run after current finishes.
- D-03: Re-generate confirmation modal: "This PR already has N reviews. Generate a new one? Both versions will be saved." Buttons: "Generate New Review" / "Cancel".
- D-04: Cancel button in webview kills CLI via CancellationToken. Partial output discarded. Returns to idle.

**CLI & Prompt**
- D-05: Both `claude` and `codex` CLIs supported. VS Code setting `easyReview.activeModel: "claude" | "codex"`. Separate path settings: `easyReview.claudePath` (existing), `easyReview.codexPath` (new).
- D-06: Same SubprocessRunner for both. Per-CLI prompt adapter with CLI-specific flags. Claude flags: `--print --verbose --output-format stream-json --include-partial-messages`. Codex flags determined empirically.
- D-07: One shared prompt template, adapted per CLI. Same 6-section output contract.
- D-08: Prompt content fixed. Includes: diff + PR title/description + author + commit messages.
- D-09: Project analysis prepended automatically when available. No user toggle.
- D-10: Model used shown in review header.

**Diff Acquisition**
- D-11: PR diff fetched via GitHub REST API using Octokit (already available). Returns patch format.

**Streaming Progress Display**
- D-12: Live streaming text in webview. Auto-scrolled to bottom.
- D-13: Chunks buffered and sent every 200ms via postMessage.
- D-14: Elapsed time counter in webview header during generation (e.g., "Generating... 45s").
- D-15: Output Channel NOT used during generation. OutputChannelReporter repurposed for errors/debug only.
- D-16: Webview state machine: `idle → generating (streaming) → complete (review) | error`.
- D-17: On failure/timeout: error state with message and Retry button (not just VS Code notification).
- D-18: On cancel: partial output discarded, returns to idle.

**Webview Panel Layout**
- D-19: Singleton panel — one ReviewPanel reused for all PRs.
- D-20: Opens in `vscode.ViewColumn.Two`.
- D-21: Persists across VS Code restarts — loads most recent review for last-opened PR from SQLite.
- D-22: Panel header: PR title + model used + timestamp + history version dropdown.
- D-23: Completed review as one scrollable document with collapsible sections. No tabs.
- D-24: Findings grouped by severity: critical (error-red), warning (warning-yellow), suggestion (info-blue).
- D-25: Review history in header dropdown: "Review 1 (Apr 3)", "Review 2 (Apr 4)".
- D-26: Mermaid shown as formatted code block. Visual rendering deferred to v2 (POL-01).
- D-27: VS Code CSS custom properties for theming. No hardcoded colors.
- D-28: Key Code Changes: side-by-side diff blocks with red/green syntax highlighting.

**SQLite Schema**
- D-29: `reviews` table: `id`, `repo_id`, `pr_number`, `model_used`, `created_at`, `review_text`, `parsed_json`.
- D-30: `project_analyses` table: `id`, `collected_at`, `context_text`. Single row — overwrite on re-run.

**Project Analysis**
- D-31: Triggered by manual command "Easy Review: Analyze Project" in command palette.
- D-32: Collects: README.md + top-level `src/` listing + `package.json` + last 20 git log entries. Concatenated to `context_text`.
- D-33: VS Code `withProgress` cancellable notification during analysis.
- D-34: Completion notification: "Project analysis complete. Collected: README.md, N source files, M recent commits."
- D-35: Re-running overwrites previous row. No versioning.
- D-36: No expiry or auto re-run prompt.

**PR History Analysis**
- D-37: Separate command "Easy Review: Analyze PR History". Fetches last 100 PR titles + descriptions + merge dates via GitHub API. Appended to `project_analyses.context_text`.

### Claude's Discretion

- Exact Codex CLI flags and output format (empirical testing at implementation time)
- ReviewParser implementation details — regex, markdown heading detection, etc.
- Exact postMessage protocol shape between extension host and webview
- React component structure within the webview (state management, component split)
- Specific wording of confirmation dialogs and notification messages (except those locked in UI-SPEC)
- Queue implementation approach (simple sequential promise chain is likely sufficient)

### Deferred Ideas (OUT OF SCOPE)

- Mermaid visual rendering — v2 POL-01
- Dual-model side-by-side comparison — v2 DUAL-02
- Review search across stored reviews — v2 POL-02
- Privanote MCP context injection — Phase 3
- Privanote REST API push — Phase 3
- GitHub comment posting — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REV-01 | User can trigger AI review generation for any PR (open, closed, or merged) with a single command | Right-click context menu on PRTreeItem → `easyReview.generateReview` command; `EasyReviewPRsProvider` already provides tree items with PR metadata |
| REV-02 | Review follows 6-section structured format: Executive Summary, Categorized Changes, Key Code Changes, Findings, Impact Analysis, Mermaid | Prompt template defines output contract; `ReviewParser` splits raw CLI output into sections via markdown heading detection |
| REV-03 | Review generation streams real-time progress to webview panel | `SubprocessRunner` streams line-by-line via `readline`; 200ms batch timer forwards chunks to webview via `postMessage` |
| REV-04 | Generated review persisted to SQLite on completion | New `reviews` STRICT table added via migration; `StorageAdapter` extended with `saveReview` / `getReviews` methods |
| REV-05 | User can re-generate; new review appended with timestamp alongside prior versions | Each generation inserts a new row in `reviews`; history dropdown in webview header surfaces all versions |
| VIEW-01 | Completed review in dedicated webview panel with full 6-section format | Singleton `ReviewPanel` (`vscode.WebviewPanel`); `ReviewDocument` React component with 6 `CollapsibleSection` children |
| VIEW-02 | Webview displays findings classified by severity | `FindingsSection` + `FindingCard` components; severity colors from VS Code CSS custom properties |
| VIEW-03 | User can view review history for any PR | `HistoryDropdown` in `PanelHeader`; loading a prior review sends `loadReview` postMessage round-trip |
| PROJ-01 | One-time project analysis collects README, source files, architecture as persistent context | `ProjectAnalysisService` reads workspace files via Node `fs`; runs git log via child_process; stores to `project_analyses` table |
| PROJ-02 | Bulk analysis of past PRs (last 100) for historical context | `ProjectAnalysisService.fetchPRHistory()` via `octokit.rest.pulls.list` with `state: 'all'`, limited to 100; appended to `context_text` |
| PROJ-03 | Project analysis stored in SQLite and reused across sessions | `StorageAdapter.getProjectAnalysis()` called during prompt assembly; prepended to prompt when present |
</phase_requirements>

---

## Summary

Phase 2 builds on a complete Phase 1 foundation. The streaming CLI infrastructure (`SubprocessRunner`), SQLite storage (`SQLiteStore`), GitHub API access (`Octokit` via `CredentialStore`), build pipeline (esbuild for extension host, Vite for webview), and command registration patterns (`activation.ts` with `getStore()`/`getProvider()`) are all in place and working.

The primary Phase 2 work has three independent streams that converge: (1) extending `SubprocessRunner` into a `ReviewRunner` that sends chunks to a webview instead of an OutputChannel, (2) building the React webview panel with the 4-state machine defined in 02-UI-SPEC.md, and (3) adding SQLite migrations for `reviews` and `project_analyses` tables with new `StorageAdapter` methods.

The critical technical unknown is the `codex` CLI output format and flags. The `claude` CLI format is already validated and documented in `SubprocessRunner.ts` comments (stream-json events with `event.event?.delta?.text` paths). The `codex` integration must be treated as a spike — the planner should schedule this early, with Codex adapter implementation deferred until empirical testing confirms the output shape.

**Primary recommendation:** Wire `ReviewRunner` → batched postMessage → webview first (the hardest integration boundary), then build the React panel second, then ReviewParser third. The UI-SPEC is complete and locked; implement against it directly.

---

## Standard Stack

### Core (already installed — do not re-install)

| Library | Installed Version | Purpose | Status |
|---------|------------------|---------|--------|
| `better-sqlite3` | `^12.8.0` | SQLite storage, sync API | In use (Phase 1) |
| `react` | `^16.12.0` | Webview UI | In package.json (upstream) |
| `react-dom` | `^16.12.0` | Webview rendering | In package.json (upstream) |
| `@vscode/codicons` | `^0.0.36` | VS Code icons in webview | In package.json |
| `esbuild` (via `build:extension` script) | `^0.20.x` (actual: node esbuild.extension.js) | Extension host bundling | In use (Phase 1) |
| `vite` (via `build:webview` script) | Upstream version | Webview bundling | Config at `vite.webview.config.ts` — entry `src/webview/index.tsx` |
| `vitest` | `^4.1.2` | Unit test runner | Configured at `vitest.config.ts` — runs `src/test/unit/**/*.test.ts` |

**Note on React version:** The installed version is React **16** (not 18 as in CLAUDE.md's recommendation table). The UI-SPEC confirms this: "React 16, no shadcn, no Tailwind." All Phase 2 React code must use React 16 patterns — no hooks that require React 17+ (e.g., `useId`). `useState`, `useEffect`, `useRef`, `useCallback` are all available in React 16.8+.

### New for Phase 2 (no installation needed — using existing capabilities)

| Tool / API | Source | Purpose |
|------------|--------|---------|
| `child_process` (Node built-in) | Already used in SubprocessRunner | Subprocess management |
| `readline` (Node built-in) | Already used in SubprocessRunner | Line-buffered stdout parsing |
| `fs` (Node built-in) | Available in extension host | Read workspace files for project analysis |
| `octokit.rest.pulls.get` | Already wired via `CredentialStore` + `hub.octokit.api` | Fetch PR diff in patch format |
| `octokit.rest.pulls.list` | Same instance | Fetch PR history for PROJ-02 |
| `vscode.window.withProgress` | VS Code API | Progress notification for project analysis |
| `vscode.WebviewPanel` | VS Code API | Singleton review panel |

### Webview Build Entry Point

The Vite config already exists at `vite.webview.config.ts` with:
- Entry: `src/webview/index.tsx`
- Output: `dist/webview/webview.js`
- `@shared` alias → `src/shared/`

**`src/webview/` directory does not exist yet** — Phase 2 creates it from scratch.

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
  easy-review/
    cli/
      ReviewRunner.ts          # Wraps SubprocessRunner; per-CLI adapters; sends chunks to webview
      ClaudeAdapter.ts         # Claude-specific flags + stream-json parsing (extracted from SubprocessRunner)
      CodexAdapter.ts          # Codex-specific flags + output parsing (spike first)
      PromptBuilder.ts         # Assembles prompt: diff + metadata + project analysis
      ReviewParser.ts          # Splits raw output into 6 ReviewSection objects
    storage/
      schema.ts                # EXTEND: add REVIEWS_TABLE_DDL + PROJECT_ANALYSES_TABLE_DDL
      StorageAdapter.ts        # EXTEND: add review + project analysis CRUD methods
      SQLiteStore.ts           # EXTEND: implement new StorageAdapter methods
      types.ts                 # EXTEND: add StoredReview, StoredProjectAnalysis, ReviewSection types
    github/
      DiffFetcher.ts           # Fetches PR diff via octokit.rest.pulls.get (accept header: application/vnd.github.v3.diff)
      ProjectAnalysisService.ts # Reads workspace files + fetches PR history; stores to project_analyses
    panel/
      ReviewPanel.ts           # Singleton WebviewPanel lifecycle; message bus; postMessage batching timer
  shared/
    types.ts                   # EXTEND: add ExtensionToWebview + WebviewToExtension message protocol types
  webview/
    index.tsx                  # React root; acquires vscode API; sets up message listener
    ReviewPanel.tsx            # Root component: state machine idle/generating/complete/error
    PanelHeader.tsx            # Sticky header: PR title, model badge, elapsed counter, history dropdown
    StreamingView.tsx          # Generating state: auto-scrolling live text + Cancel Generation button
    ReviewDocument.tsx         # Complete state: 6 CollapsibleSection children
    CollapsibleSection.tsx     # Expand/collapse with chevron icon
    FindingsSection.tsx        # Groups FindingCard by severity
    FindingCard.tsx            # Single finding with severity border color
    DiffBlock.tsx              # Before/after side-by-side code blocks
    HistoryDropdown.tsx        # <select> styled per common.css
    ErrorView.tsx              # Error state with Retry Review button
    IdleView.tsx               # Idle placeholder
    ElapsedCounter.tsx         # setInterval timer, label typography
```

### Pattern 1: ReviewRunner — Replacing OutputChannel with Webview Sink

The existing `SubprocessRunner` (Phase 1) takes an `outputChannel` and appends to it. Phase 2 replaces this sink with a batched postMessage sender. The cleanest approach is a new `ReviewRunner` that wraps `SubprocessRunner`'s logic with a different sink:

```typescript
// src/easy-review/cli/ReviewRunner.ts
export interface ReviewRunOptions {
  prompt: string;
  token: vscode.CancellationToken;
  onChunk: (text: string) => void;   // called with batched text every 200ms
}

export async function runReview(
  cliPath: string,
  cliArgs: string[],         // per-CLI flags from adapter
  opts: ReviewRunOptions,
): Promise<string> {
  // Same logic as SubprocessRunner but calls opts.onChunk instead of outputChannel.append
  // 200ms batch timer: accumulate chunks, flush every 200ms via setInterval
}
```

The `ReviewPanel` calls `ReviewRunner` and passes an `onChunk` that calls `panel.webview.postMessage({ type: 'streamChunk', text })`.

### Pattern 2: SQLite Migration for Phase 2 Tables

Following the established pattern in `SQLiteStore.ts` (STRICT tables, WAL mode), add Phase 2 DDL to `schema.ts` and run in `SQLiteStore.initialize()`:

```typescript
// src/easy-review/storage/schema.ts — EXTEND, do not replace

export const REVIEWS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id     TEXT    NOT NULL,
    pr_number   INTEGER NOT NULL,
    model_used  TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    review_text TEXT    NOT NULL,
    parsed_json TEXT    NOT NULL DEFAULT '{}'
  ) STRICT;
`;

export const PROJECT_ANALYSES_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS project_analyses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    collected_at INTEGER NOT NULL,
    context_text TEXT    NOT NULL
  ) STRICT;
`;
```

`SQLiteStore.initialize()` calls `this.db.exec(REVIEWS_TABLE_DDL)` and `this.db.exec(PROJECT_ANALYSES_TABLE_DDL)` after the existing `PR_TABLE_DDL` exec. `CREATE TABLE IF NOT EXISTS` is idempotent — safe to run on every activation.

### Pattern 3: Webview Singleton with State Sync Handshake

Per D-19, one `ReviewPanel` instance is reused. The established VS Code pattern (from ARCHITECTURE.md) for this:

```typescript
// src/easy-review/panel/ReviewPanel.ts
export class ReviewPanel {
  private static instance: ReviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  static getOrCreate(context: vscode.ExtensionContext): ReviewPanel {
    if (!ReviewPanel.instance) {
      ReviewPanel.instance = new ReviewPanel(context);
    }
    return ReviewPanel.instance;
  }

  // Ready handshake — webview signals load, host sends current state
  // panel.webview.onDidReceiveMessage({ type: 'ready' }) → postMessage({ type: 'stateSync', ... })
}
```

`retainContextWhenHidden` must be `false` (memory cost). The state-sync handshake restores state when the panel is re-shown after being hidden.

### Pattern 4: Shared Message Protocol in `src/shared/types.ts`

The existing `src/shared/types.ts` is currently empty (`export {}`). Phase 2 fills it with the message union types:

```typescript
// src/shared/types.ts — replace empty placeholder

// Extension host → Webview
export type ExtensionMessage =
  | { type: 'startReview'; prNumber: number; prTitle: string; model: string }
  | { type: 'streamChunk'; text: string }
  | { type: 'reviewComplete'; review: ParsedReview }
  | { type: 'reviewError'; message: string }
  | { type: 'stateSync'; state: WebviewState }
  | { type: 'loadReviewResult'; review: ParsedReview };

// Webview → Extension host
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'cancelReview' }
  | { type: 'retryReview' }
  | { type: 'loadReview'; reviewId: number }
  | { type: 'requestState' };

export interface ParsedReview {
  id: number;
  prNumber: number;
  repoId: string;
  model: string;
  createdAt: number;
  sections: ReviewSection[];
}

export interface ReviewSection {
  title: string;          // "Executive Summary", "Findings", etc.
  content: string;        // raw markdown content for this section
  findings?: Finding[];   // populated only for Findings section
}

export interface Finding {
  severity: 'critical' | 'warning' | 'suggestion';
  body: string;
}

export type WebviewState =
  | { status: 'idle' }
  | { status: 'generating'; prTitle: string; model: string; elapsedMs: number }
  | { status: 'complete'; review: ParsedReview }
  | { status: 'error'; message: string };
```

This file is imported by both the extension host (`ReviewPanel.ts`) and the webview (`index.tsx`) — the Vite config already has the `@shared` alias pointing to `src/shared/`.

### Pattern 5: Diff Fetch via Octokit

The GitHub API returns PR diffs in patch format when the `Accept` header is `application/vnd.github.v3.diff`. The Octokit instance is already available as `hub.octokit.api` from `credentialStore.getHub(AuthProvider.github)`:

```typescript
// src/easy-review/github/DiffFetcher.ts
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  const response = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  });
  return response.data as unknown as string;
}
```

**Note:** Octokit's TypeScript types don't expose the `diff` format return type cleanly — `as unknown as string` is the accepted workaround. The raw patch text is returned in `response.data`.

### Pattern 6: Project Analysis File Collection

```typescript
// src/easy-review/github/ProjectAnalysisService.ts
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

export async function collectProjectContext(workspaceRoot: string): Promise<string> {
  const parts: string[] = [];

  // README.md
  const readmePath = path.join(workspaceRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    parts.push('## README\n' + fs.readFileSync(readmePath, 'utf8'));
  }

  // package.json
  const pkgPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    parts.push('## package.json\n' + fs.readFileSync(pkgPath, 'utf8'));
  }

  // src/ directory listing (top-level only per D-32)
  const srcPath = path.join(workspaceRoot, 'src');
  if (fs.existsSync(srcPath)) {
    const entries = fs.readdirSync(srcPath);
    parts.push('## src/ structure\n' + entries.join('\n'));
  }

  // Last 20 git log entries (D-32)
  const gitLog = await runGitLog(workspaceRoot, 20);
  parts.push('## Recent commits\n' + gitLog);

  return parts.join('\n\n---\n\n');
}

function runGitLog(cwd: string, count: number): Promise<string> {
  return new Promise((resolve) => {
    cp.exec(
      `git log --oneline --format="%h %an %ad %s" --date=short -n ${count}`,
      { cwd },
      (err, stdout) => resolve(err ? '' : stdout.trim()),
    );
  });
}
```

### Anti-Patterns to Avoid

- **Modifying SubprocessRunner directly:** Phase 2 does not modify `SubprocessRunner.ts`. It creates `ReviewRunner.ts` that duplicates the spawn logic with a webview sink. This prevents breaking the existing `testCLI` command which still uses `SubprocessRunner` + OutputChannel.
- **Sending every chunk as a separate postMessage:** The 200ms batch timer is mandatory (D-13). Sending one postMessage per readline event will overwhelm the webview's message queue during fast streaming.
- **`retainContextWhenHidden: true`:** Explicitly forbidden — significant memory overhead. Use the state-sync handshake.
- **Storing only `review_text` without `parsed_json`:** D-29 requires both. `review_text` is the raw output; `parsed_json` is the structured result. Store both — raw for debugging, parsed for rendering. Parsing at render time is fragile as CLI output format may change.
- **Direct network calls from the webview:** All GitHub API calls (diff fetch, history fetch) happen in the extension host. The webview is a pure renderer — it only calls postMessage.
- **Modifying upstream webview files:** Phase 2 adds `src/webview/` (entirely new directory). Do not modify files under `webviews/` (upstream React components).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading line-by-line from CLI stdout | Custom buffer + split logic | `readline.createInterface` (Node built-in) | Already used in SubprocessRunner; handles partial lines, backpressure correctly |
| 200ms chunk batching | Manual `setTimeout` clearing/resetting | `setInterval` with accumulated buffer | Simpler — interval fires at fixed rate; accumulator cleared on each fire |
| Octokit diff fetch | Custom GitHub REST call with fetch | `octokit.rest.pulls.get` with `mediaType: { format: 'diff' }` | Already authenticated; handles token refresh, rate limits |
| Git log reading | Node `fs` tree walk | `child_process.exec('git log ...')` | Git already tracks this; no need to parse commit files |
| PR history fetch | Pagination loop from scratch | `octokit.rest.pulls.list` with `per_page: 100, state: 'all'` | Single call returns 100 PRs; rate-limit headers handled by Octokit |
| Section heading detection in review | Custom ML/regex parser | Split on `## ` markdown headings | Claude output reliably uses H2 headings for the 6 sections — simple split is sufficient and predictable |
| VS Code-themed buttons, selects | Custom CSS components | VS Code CSS custom properties + `@vscode/codicons` | Upstream webviews already use this pattern; matches any VS Code theme automatically |
| Webview state persistence | `localStorage` / `IndexedDB` | State-sync handshake via postMessage on `ready` | `localStorage` unreliable in webviews across restarts; SQLite via extension host is the source of truth |

**Key insight:** Every external call (GitHub API, CLI subprocess) must go through the extension host. The webview is display-only. All persistence is SQLite via the extension host. This is not optional — VS Code's CSP enforces it.

---

## Common Pitfalls

### Pitfall 1: Codex CLI Output Format is Unknown
**What goes wrong:** Building `ReviewParser` that only handles Claude's `stream-json` format, then discovering Codex outputs plain text or a different JSON schema.
**Why it happens:** D-06 says "Codex flags to be determined empirically." There is no documented source for the exact Codex CLI streaming format.
**How to avoid:** First task in the plan must be a Codex CLI spike. Test `codex --help` and run it with a simple prompt before writing `CodexAdapter.ts`. If the output format differs significantly from Claude's, the adapter handles the translation.
**Warning signs:** If you write `CodexAdapter.ts` before running `codex` against a test prompt, you are building on a guess.

### Pitfall 2: ReviewParser is Fragile Against LLM Output Variation
**What goes wrong:** LLM output doesn't always start sections with exactly `## Executive Summary` — Claude may add a preamble, output a slightly different heading, or combine sections.
**Why it happens:** LLMs are non-deterministic. Even a well-specified prompt produces slight variations across runs.
**How to avoid:** Use case-insensitive heading matching. Accept both `##` and `###` as section markers. If parsing fails to find all 6 sections, fall back to storing the entire output as a single "raw" section rather than failing. Log a warning when falling back.
**Warning signs:** ReviewParser fails on 5% of test reviews during development. This is expected — add fallback, don't try to make prompts deterministic.

### Pitfall 3: Webview Loses State When Panel is Hidden
**What goes wrong:** User switches away from the review panel and back. The React component tree is unmounted and remounted. All local state (current review, scroll position) is lost.
**Why it happens:** VS Code destroys webview renderer when panel is hidden (unless `retainContextWhenHidden: true`, which is intentionally not used here).
**How to avoid:** Implement the ready-handshake pattern: on `ready` message from webview, extension host sends `stateSync` with the full current state. `ReviewPanel.ts` maintains a `currentState: WebviewState` field that is always up-to-date.
**Warning signs:** Review disappears when user clicks another file and returns to the panel.

### Pitfall 4: Singleton Panel Not Properly Disposed
**What goes wrong:** `ReviewPanel.instance` holds a reference to a disposed `vscode.WebviewPanel`. Calling `panel.webview.postMessage` after the panel is closed throws.
**Why it happens:** The panel fires `onDidDispose` when the user closes it. If this event doesn't clear `ReviewPanel.instance`, stale references cause errors.
**How to avoid:** In the panel constructor, register `this.panel.onDidDispose(() => { ReviewPanel.instance = undefined; })`. Always null-check before posting messages.
**Warning signs:** "Cannot call methods on disposed object" errors in the Output Channel.

### Pitfall 5: Project Analysis Workspace Root is Undefined
**What goes wrong:** `vscode.workspace.workspaceFolders` is `undefined` or empty when the extension is activated without a workspace open. `ProjectAnalysisService` crashes trying to read `README.md` from `undefined/README.md`.
**Why it happens:** VS Code can be opened without a workspace (e.g., empty window). The extension activates but there is no workspace root.
**How to avoid:** At the start of `ProjectAnalysisService`, check `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath`. If undefined, show an error: "Easy Review: Open a workspace folder before running project analysis."
**Warning signs:** "ENOENT: no such file or directory" errors during project analysis when no folder is open.

### Pitfall 6: The `StoredPR.raw` Field Contains the Diff — or Does It?
**What goes wrong:** Assuming the `raw` JSON stored in SQLite contains the full diff. It does not. `raw` is the GitHub API PR response object, which does NOT include the diff — it only has metadata.
**Why it happens:** The PR diff is a separate GitHub API call (`/repos/{owner}/{repo}/pulls/{number}` with `Accept: application/vnd.github.v3.diff`). `AllStatesPRFetcher.ts` stores only the PR metadata response as `raw`.
**How to avoid:** Always fetch the diff fresh via `DiffFetcher.ts` at review time — do not attempt to read it from `stored_pr.raw`. The diff may also change if new commits are pushed to an open PR.
**Warning signs:** Review generation uses a diff that contains only PR metadata JSON, causing the AI to produce an incoherent review.

### Pitfall 7: 200ms Batch Timer Not Cleared on Cancel or Completion
**What goes wrong:** The `setInterval` that batches streaming chunks continues firing after generation completes or is cancelled. Stale chunks arrive at the webview after the state has transitioned to `complete` or `idle`, corrupting the UI.
**Why it happens:** `setInterval` must be explicitly stopped with `clearInterval`. If the promise resolves/rejects and the timer is not cleared in a `finally` block, it keeps firing.
**How to avoid:** Store the interval ID in a variable. Clear it in the promise's `finally` block and in the cancellation handler.
**Warning signs:** Random text appearing in the completed review display after generation finishes.

---

## Code Examples

### Octokit Diff Fetch (verified against existing Octokit usage in codebase)
```typescript
// Source: Octokit REST API (same octokit instance used in AllStatesPRFetcher.ts)
const response = await octokit.rest.pulls.get({
  owner,
  repo,
  pull_number: prNumber,
  mediaType: { format: 'diff' },   // triggers application/vnd.github.v3.diff Accept header
});
// response.data is string (patch format) despite TypeScript typing it as object
const diffText = response.data as unknown as string;
```

### Batched PostMessage Pattern (D-13)
```typescript
// In ReviewPanel.ts — 200ms batch timer
let buffer = '';
const flushInterval = setInterval(() => {
  if (buffer.length > 0) {
    panel.webview.postMessage({ type: 'streamChunk', text: buffer });
    buffer = '';
  }
}, 200);

// Pass to ReviewRunner as onChunk callback
function onChunk(text: string): void {
  buffer += text;
}

// CRITICAL: clear in finally block
try {
  const rawOutput = await runReview(cliPath, cliArgs, { prompt, token, onChunk });
  // ...
} finally {
  clearInterval(flushInterval);
  if (buffer.length > 0) {
    panel.webview.postMessage({ type: 'streamChunk', text: buffer });
    buffer = '';
  }
}
```

### Webview Ready Handshake (established VS Code pattern)
```typescript
// In ReviewPanel.ts
panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
  if (msg.type === 'ready') {
    panel.webview.postMessage({ type: 'stateSync', state: this.currentState });
  }
  // ... other message handling
});
```

### React 16 State Machine in ReviewPanel.tsx
```tsx
// No useId (React 17+) — use useState/useEffect/useRef only
import React, { useState, useEffect, useRef } from 'react';
import type { WebviewState, ExtensionMessage } from '@shared/types';

const vscode = acquireVsCodeApi();

export function ReviewPanel() {
  const [state, setState] = useState<WebviewState>({ status: 'idle' });

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      if (msg.type === 'stateSync') { setState(msg.state); }
      else if (msg.type === 'startReview') {
        setState({ status: 'generating', prTitle: msg.prTitle, model: msg.model, elapsedMs: 0 });
      }
      // ... etc
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });  // trigger state sync
    return () => window.removeEventListener('message', handler);
  }, []);

  // render based on state.status
}
```

### ReviewParser — Markdown Section Splitter
```typescript
// Source: Claude pattern (verified in SubprocessRunner.ts comments)
export function parseReview(rawText: string): ReviewSection[] {
  // Split on markdown H2 headings (case-insensitive)
  const sectionRegex = /^##\s+(.+)$/gmi;
  const sections: ReviewSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';

  for (const match of rawText.matchAll(sectionRegex)) {
    if (lastTitle) {
      sections.push({
        title: lastTitle,
        content: rawText.slice(lastIndex, match.index).trim(),
      });
    }
    lastTitle = match[1].trim();
    lastIndex = (match.index ?? 0) + match[0].length;
  }
  if (lastTitle) {
    sections.push({ title: lastTitle, content: rawText.slice(lastIndex).trim() });
  }
  // Fallback: if no sections found, return single raw section
  if (sections.length === 0) {
    return [{ title: 'Review', content: rawText }];
  }
  return sections;
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `SubprocessRunner` sends to OutputChannel | `ReviewRunner` sends batched chunks to webview postMessage | Phase 2 change — OutputChannel stays for errors/debug only (D-15) |
| `StorageAdapter` has only PR CRUD methods | Phase 2 extends interface with review + project analysis methods | Interface-first: extend `StorageAdapter`, then `SQLiteStore` |
| `src/shared/types.ts` is empty placeholder | Phase 2 fills with full webview message protocol | This is the schema the entire webview communication is typed against |
| No webview React code | Phase 2 creates `src/webview/` from scratch | Vite entry `src/webview/index.tsx` already configured — just needs files |

**Key constraints from actual installed packages (not CLAUDE.md recommendations):**
- React is **16.12.0** (not 18) — confirmed in `package.json`
- Build is **webpack** (not esbuild + Vite as CLAUDE.md recommends) for upstream builds, but `build:extension` uses esbuild and `build:webview` uses Vite — the two-target setup IS in place
- `@types/vscode` targets `^1.110.0` (not 1.85.0 as in CLAUDE.md baseline)
- `@types/node` is version `22` (not `~20.x` as in CLAUDE.md) — this matches the esbuild target `node22`

---

## Open Questions

1. **Codex CLI output format**
   - What we know: Claude uses `--print --verbose --output-format stream-json --include-partial-messages` producing `{event: {delta: {text: '...'}}}` events (documented in SubprocessRunner.ts comments, verified against claude 2.1.87)
   - What's unclear: `codex` CLI flags, whether it supports streaming JSON, or outputs plain text/different format
   - Recommendation: Plan a dedicated spike task — run `codex --help` and `codex -p "say hello"` before writing `CodexAdapter.ts`

2. **How to acquire the Octokit instance inside ReviewPanel command handler**
   - What we know: `credentialStore` is passed optionally to `activateEasyReview()`. The `addPRByUrl` command already uses `credentialStore?.getHub(AuthProvider.github)?.octokit.api`
   - What's unclear: The `generateReview` command also needs Octokit. The cleanest approach is storing `credentialStore` as a module-level variable (same pattern as `_store` and `_provider`) so any command can access it
   - Recommendation: Add `let _credentialStore: CredentialStore | undefined` and `export function getCredentialStore()` to `activation.ts`, following the established module-level pattern

3. **Git availability for project analysis**
   - What we know: D-32 requires `git log` for the last 20 commits
   - What's unclear: `git` may not be in PATH in the extension host (same issue as claude/codex PATH). PathResolver only handles claude/codex.
   - Recommendation: Use `vscode.workspace.workspaceFolders?.[0]?.uri` and try `git log` via `cp.exec` — if it fails, skip the git section gracefully with a logged warning. Do not hard-fail project analysis if git is unavailable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `claude` CLI | REV-01, REV-03 | Verified (Phase 1 testCLI passed) | 2.1.87 (from SubprocessRunner comments) | None — core feature |
| `codex` CLI | REV-01 (codex model) | Unknown | — | Deferred: implement Claude path first; Codex as spike |
| `better-sqlite3` | REV-04, PROJ-03 | Confirmed (Phase 1 complete) | 12.8.0 | StorageAdapter fallback (no-op) |
| `git` | PROJ-01 | Likely yes (developer machine) | — | Skip git log section gracefully |
| Octokit (GitHub auth) | D-11, PROJ-02 | Available via `credentialStore` | @octokit/rest 22.0.0 | Show "sign in" error |
| Vite webview build | VIEW-01 | Configured (`vite.webview.config.ts` exists) | From package.json | — |
| React 16 | VIEW-01..VIEW-03 | Installed (^16.12.0) | 16.12.0 | — |

**Missing dependencies with no fallback:**
- `codex` CLI: unknown availability. The plan must include a spike to test before implementing `CodexAdapter.ts`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.2 |
| Config file | `vitest.config.ts` (exists) |
| vscode mock | `src/test/__mocks__/vscode.ts` (exists) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit` (same — no separate full suite for unit tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REV-01 | `generateReview` command registered, triggers ReviewRunner | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-runner.test.ts` |
| REV-02 | ReviewParser splits raw output into 6 sections correctly | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-parser.test.ts` |
| REV-03 | ReviewRunner batches chunks and calls onChunk callback | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-runner.test.ts` |
| REV-04 | `SQLiteStore.saveReview` persists and `getReviews` retrieves | unit | `npm run test:unit` | ❌ Wave 0: extend `src/test/unit/sqlite.test.ts` |
| REV-05 | Multiple `saveReview` calls produce distinct rows with timestamps | unit | `npm run test:unit` | ❌ Wave 0: extend `src/test/unit/sqlite.test.ts` |
| VIEW-01 | ReviewPanel creates singleton WebviewPanel (smoke) | manual-only | — | N/A — requires VS Code context |
| VIEW-02 | FindingCard renders correct severity CSS class | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-parser.test.ts` (severity extraction) |
| VIEW-03 | `getReviews(repoId, prNumber)` returns all versions ordered by created_at DESC | unit | `npm run test:unit` | ❌ Wave 0: extend `src/test/unit/sqlite.test.ts` |
| PROJ-01 | `collectProjectContext` reads README + package.json + src listing | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/project-analysis.test.ts` |
| PROJ-02 | `fetchPRHistory` calls octokit.rest.pulls.list with correct params | unit | `npm run test:unit` | ❌ Wave 0: extend `src/test/unit/project-analysis.test.ts` |
| PROJ-03 | Prompt assembly includes `context_text` when analysis exists in DB | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/prompt-builder.test.ts` |

**Note on VIEW-01:** Full webview render testing requires a VS Code extension host — this is manual validation. Unit tests cover the ReviewParser and SQLite layers that back the webview. Component-level React tests are not configured in this project (no testing-library setup) and are out of scope for Phase 2.

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit`
- **Phase gate:** `npm run test:unit` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/test/unit/review-runner.test.ts` — covers REV-01, REV-03
- [ ] `src/test/unit/review-parser.test.ts` — covers REV-02, VIEW-02
- [ ] `src/test/unit/prompt-builder.test.ts` — covers PROJ-03
- [ ] `src/test/unit/project-analysis.test.ts` — covers PROJ-01, PROJ-02
- [ ] Extend `src/test/unit/sqlite.test.ts` — covers REV-04, REV-05, VIEW-03

---

## Project Constraints (from CLAUDE.md)

All directives apply to Phase 2. Key ones relevant to this phase:

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| `"module": "commonjs"` in tsconfig | Extension host code (ReviewRunner, ReviewPanel, StorageAdapter) must remain CJS — no ESM imports |
| No webpack in new code | Extension host built by esbuild (`build:extension`); webview built by Vite (`build:webview`) — do not change |
| `better-sqlite3` sync API | All SQLite calls in `SQLiteStore` are synchronous — no async SQLite patterns |
| No `axios`, `node-fetch` v3, `got` | Octokit (already installed) handles all GitHub API calls; no new HTTP libraries |
| No Prisma | Raw SQL only (already established in Phase 1) |
| No React in extension host | `ReviewPanel.ts` is the extension host component — no JSX there; React only in `src/webview/` |
| `@vscode/webview-ui-toolkit` not `vscode-webview-ui-toolkit` | If toolkit is added, use correct package name — but UI-SPEC says no toolkit; use plain CSS |
| No ESM modules | `src/webview/index.tsx` is bundled by Vite which handles ESM → browser bundle; the source can use ESM syntax since Vite transforms it |
| No inline scripts without CSP nonce | Webview HTML must include `<meta http-equiv="Content-Security-Policy">` with nonce |
| React is **16** (confirmed from package.json) | No React 17+ hooks; no concurrent mode; no `useId`, no `useDeferredValue` |

---

## Sources

### Primary (HIGH confidence)

- `src/easy-review/cli/SubprocessRunner.ts` — stream-json event format, cancellation pattern, verified flags
- `src/easy-review/storage/SQLiteStore.ts` — STRICT table pattern, WAL mode, sync API usage
- `src/easy-review/storage/StorageAdapter.ts` — interface extension pattern
- `src/easy-review/activation.ts` — module-level getStore()/getProvider() pattern, command registration, credentialStore access
- `src/easy-review/github/AllStatesPRFetcher.ts` — Octokit access pattern, PR fetch API
- `src/easy-review/github/PRPersistenceService.ts` — service constructor pattern for testability
- `vite.webview.config.ts` — confirmed entry point `src/webview/index.tsx`, output `dist/webview/webview.js`, `@shared` alias
- `vitest.config.ts` — test directory `src/test/unit/**`, vscode mock alias, coverage config
- `package.json` — confirmed React 16.12.0, vitest 4.1.2, @types/vscode 1.110.0, build scripts
- `.planning/phases/02-ai-review-generation/02-CONTEXT.md` — all locked decisions D-01 through D-37
- `.planning/phases/02-ai-review-generation/02-UI-SPEC.md` — full component inventory, typography, color, layout
- `.planning/research/ARCHITECTURE.md` — component map, webview patterns, state sync handshake
- `.planning/research/PITFALLS.md` — 14 pitfalls with mitigations

### Secondary (MEDIUM confidence)

- VS Code Extension API — webview postMessage, `withProgress`, `WebviewPanel` — stable API patterns (unchanged since VS Code 1.57)
- Octokit `mediaType: { format: 'diff' }` — standard pattern for GitHub patch format retrieval

### Tertiary (LOW confidence)

- Codex CLI output format — unknown; marked as spike in planning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed from package.json; no ambiguity
- Architecture: HIGH — Phase 1 code is fully readable; patterns are established; integration points are clear
- Pitfalls: HIGH — most pitfalls derived from reading actual code; two (Codex, git PATH) are flagged as unknown

**Research date:** 2026-04-03
**Valid until:** 2026-06-01 (stable domain; only risk is Codex CLI format changing or VS Code releasing a breaking Electron version change)
