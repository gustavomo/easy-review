# Architecture Patterns

**Domain:** VS Code extension (fork of microsoft/vscode-pull-request-github) with AI review generation, SQLite persistence, and MCP client integration
**Researched:** 2026-04-03
**Confidence note:** Web and search tools are unavailable in this session. Findings are based on training-data knowledge of the vscode-pull-request-github repo (public, well-documented, stable architecture as of August 2025) and official VS Code extension API patterns. Confidence levels are marked per section.

---

## 1. How microsoft/vscode-pull-request-github Is Structured

**Confidence: MEDIUM** — based on training data; source tree may have shifted in minor ways since August 2025, but the major layer structure has been stable for years.

### Top-Level Source Layout

```
src/
  extension.ts              — entry point, activates all subsystems
  authentication/           — GitHub OAuth via VS Code built-in auth provider
  github/                   — core GitHub API client (Octokit wrapper), PR models
  view/                     — VS Code tree view providers (PR list, changed files, comments)
  webviews/                 — webview panels (PR description, review panel, diff)
  commands/                 — VS Code command registrations
  common/                   — shared types, utilities, constants
  issues/                   — issue-related providers (separate sub-feature)
  notifications/            — PR notification system
  test/                     — unit + integration tests
webviews/
  (React/preact UI source for webview panels, compiled separately)
```

### Main Architectural Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Extension Host** | `src/extension.ts` + subsystems | VS Code API surface; registers all providers, commands, event handlers |
| **GitHub Auth** | `src/authentication/` | Delegates to VS Code built-in `github` auth provider; obtains and refreshes OAuth tokens |
| **GitHub API Client** | `src/github/` | Octokit-based client; PR CRUD, comment posting, diff fetching, GraphQL queries |
| **Tree Providers** | `src/view/` | Implements `TreeDataProvider` for PR list, changed files tree, comment threads |
| **Comment Controller** | `src/view/` | Implements `CommentingRangeProvider` and `CommentController` for inline review comments |
| **Webview Panels** | `src/webviews/` + `webviews/` | PR description panel, review submission panel — each is a sandboxed HTML page communicating via `postMessage` |
| **State Management** | `src/github/` (PullRequestManager) | Central object that owns open PRs, checkout state, and event emitters |

### Key Classes (Confidence: MEDIUM)

- `PullRequestManager` — singleton that mediates between GitHub API and all UI providers; owns the list of currently tracked PRs
- `PullRequestModel` — domain object wrapping a single PR's data, diff, and comment threads
- `ReviewManager` — orchestrates the multi-step review flow (start review, add comments, submit)
- `FolderRepositoryManager` — manages per-workspace-folder GitHub connections
- `GitHubRepository` — wraps a specific remote repo + Octokit session

### What the Fork Needs to Extend

The upstream extension only shows open PRs in the sidebar tree. To support closed and merged PRs you must:

1. Extend the `PullRequestsTreeDataProvider` (or equivalent tree provider) to pass additional `state` filters to the GitHub list API (`closed`, `all`).
2. Add new tree sections or filter controls in the sidebar webview.
3. The underlying `PullRequestModel` and GitHub API client already handle closed/merged PR data — the restriction is in the tree filter, not in the data model.

---

## 2. Where AI Review Generation Fits

**Confidence: HIGH** — this is new code; the placement is architectural judgement, not reverse-engineered from upstream.

### Recommended Placement: `src/ai/` subsystem

The AI layer should be a self-contained subsystem that the extension host coordinates. It does NOT go inside any existing upstream layer to avoid merge conflicts when pulling upstream changes.

```
src/
  ai/
    AIReviewOrchestrator.ts   — top-level coordinator; called from commands
    SubprocessRunner.ts       — spawns claude/codex CLI, streams output
    PromptBuilder.ts          — assembles context (diff, project analysis, MCP notes)
    ReviewParser.ts           — parses structured CLI output into typed ReviewResult
    types.ts                  — ReviewRequest, ReviewResult, ReviewStatus types
```

### Data Flow: AI Review Generation

```
User triggers "Generate Review" command
  → AIReviewOrchestrator.generateReview(pr: PullRequestModel)
      → SQLiteStore.getProjectAnalysis(repoId)          [cached context]
      → MCPClient.queryPrivanoteContext(pr.title, ...)  [live context pull]
      → PromptBuilder.build(pr, projectAnalysis, notes) [assemble prompt]
      → SubprocessRunner.run("claude", args, prompt)    [async, streamed]
          → streams partial output to webview via postMessage
      → ReviewParser.parse(rawOutput)                   [structure result]
      → SQLiteStore.saveReview(review)                  [persist]
      → WebviewPanel.postMessage({ type: "reviewComplete", review })
```

### Integration Points

| Extension Point | How AI Layer Hooks In |
|-----------------|-----------------------|
| VS Code command | `vscode.commands.registerCommand("easyReview.generateAIReview", ...)` |
| Context menu | Contribution point in `package.json` on PR tree items |
| Webview panel | AI review occupies a new dedicated panel, separate from the upstream PR description panel |
| Status bar | Progress indicator during long CLI runs |

---

## 3. SQLite Layer Structure

**Confidence: HIGH** — schema design is new; library choice (better-sqlite3 vs sql.js) is based on VS Code extension constraints.

### Library Choice

Use **better-sqlite3** (not sql.js) because:
- Synchronous API avoids callback/promise complexity in the extension host (where you already have async event loops)
- Native Node bindings work well in the VS Code extension host (Electron's Node runtime)
- Supports WAL mode for safe concurrent reads during long CLI runs
- better-sqlite3 requires rebuilding native bindings for the Electron ABI — this is a known but solvable constraint handled via `electron-rebuild` in the build pipeline

**MEDIUM confidence caveat:** VS Code's Electron version changes with each release. You must pin `better-sqlite3` rebuild against the correct Electron ABI version. The alternative `sql.js` (pure WASM) avoids native binding issues entirely but is slower and uses more memory. For a personal tool with modest data volumes, either works; better-sqlite3 is recommended for developer ergonomics.

### Recommended Schema

```sql
-- Repositories tracked by the extension
CREATE TABLE repos (
  id          TEXT PRIMARY KEY,   -- "{owner}/{repo}"
  owner       TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL    -- unix timestamp
);

-- Project analysis (one per repo, updated on demand)
CREATE TABLE project_analyses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id     TEXT NOT NULL REFERENCES repos(id),
  content     TEXT NOT NULL,      -- full structured analysis JSON
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Pull requests (snapshot at review time)
CREATE TABLE pull_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id     TEXT NOT NULL REFERENCES repos(id),
  pr_number   INTEGER NOT NULL,
  title       TEXT NOT NULL,
  state       TEXT NOT NULL,      -- open | closed | merged
  author      TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  head_branch TEXT NOT NULL,
  diff_url    TEXT,
  raw_data    TEXT NOT NULL,      -- full PR JSON snapshot
  created_at  INTEGER NOT NULL,
  UNIQUE(repo_id, pr_number)
);

-- AI-generated reviews
CREATE TABLE reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id           INTEGER NOT NULL REFERENCES pull_requests(id),
  cli_tool        TEXT NOT NULL,  -- "claude" | "codex"
  prompt_hash     TEXT NOT NULL,  -- SHA256 of the assembled prompt
  raw_output      TEXT NOT NULL,  -- full CLI stdout
  parsed_content  TEXT NOT NULL,  -- structured ReviewResult JSON
  status          TEXT NOT NULL,  -- pending | complete | error
  posted_to_github INTEGER DEFAULT 0,
  sent_to_privanote INTEGER DEFAULT 0,
  created_at      INTEGER NOT NULL
);

-- Individual review comments (extracted from parsed review)
CREATE TABLE review_comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER NOT NULL REFERENCES reviews(id),
  file_path   TEXT,
  line_start  INTEGER,
  line_end    INTEGER,
  body        TEXT NOT NULL,
  severity    TEXT,               -- critical | warning | suggestion | info
  created_at  INTEGER NOT NULL
);

-- MCP context snapshots used during a review
CREATE TABLE mcp_context_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id   INTEGER NOT NULL REFERENCES reviews(id),
  notes_json  TEXT NOT NULL,      -- Privanote notes pulled for this review
  created_at  INTEGER NOT NULL
);
```

### Storage Layer Structure

```
src/
  storage/
    SQLiteStore.ts           — single class wrapping all DB operations
    schema.ts                — CREATE TABLE statements as constants
    migrations.ts            — simple version-based migration runner
    types.ts                 — StoredReview, StoredPR, ProjectAnalysis types
```

### SQLiteStore Responsibilities

- `initialize()` — opens DB file in VS Code's `globalStorageUri`, runs migrations
- `getProjectAnalysis(repoId)` / `saveProjectAnalysis(repoId, content)`
- `savePullRequest(pr)` / `getPullRequest(repoId, prNumber)`
- `saveReview(review)` / `getReviews(prId)` / `getReview(id)`
- `markPostedToGitHub(reviewId)` / `markSentToPrivanote(reviewId)`

The DB file lives at `context.globalStorageUri.fsPath + "/easy-review.db"` — VS Code manages this path per extension install.

---

## 4. MCP Client Integration Inside a VS Code Extension

**Confidence: MEDIUM** — MCP is an evolving protocol (Anthropic, late 2024). The Node.js SDK exists but patterns for in-extension use are not yet widely documented. The approach below is architecturally sound but may need adjustment once the SDK stabilizes.

### Approach: MCP Client as an In-Process SDK Consumer

The extension spawns or connects to the Privanote MCP server as a client. Two options:

**Option A (recommended): Connect to an already-running MCP server via stdio or HTTP**

If Privanote's MCP server can be started as a local HTTP/SSE server (or is already running), the extension uses the `@modelcontextprotocol/sdk` Node.js client to connect.

```typescript
// src/mcp/MCPClient.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class PrivanoteMCPClient {
  private client: Client;

  async connect(serverCommand: string, serverArgs: string[]) {
    const transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs,
    });
    this.client = new Client({ name: "easy-review", version: "1.0.0" }, {});
    await this.client.connect(transport);
  }

  async queryContext(query: string): Promise<string[]> {
    const result = await this.client.callTool({
      name: "search_notes",
      arguments: { query },
    });
    return result.content as string[];
  }

  async disconnect() {
    await this.client.close();
  }
}
```

**Option B: Invoke MCP server as a subprocess per-call**

Simpler but slower — spawn the server, call one tool, close. Acceptable for a personal tool where latency is not critical.

### MCP Client Structure

```
src/
  mcp/
    MCPClient.ts             — connects to Privanote MCP server
    MCPConnectionManager.ts  — lifecycle: connect on activation, reconnect on failure
    types.ts                 — MCPNote, MCPQueryResult types
```

### Extension Activation Sequence with MCP

```
extension.activate()
  → SQLiteStore.initialize()
  → MCPConnectionManager.connect(config.privanoteMCPCommand)
  → register tree providers, commands, webview providers
```

The MCP connection is lazy-initialized on first use if the server is not available at startup, to avoid blocking activation.

---

## 5. Webview Communication Patterns

**Confidence: HIGH** — this is a stable, well-documented VS Code API pattern unchanged since VS Code 1.57.

### Architecture: Extension Host + Webview as Two Separate Runtimes

The webview runs in an isolated renderer process. The only communication channel is `postMessage` / `onDidReceiveMessage`. Treat this boundary like a network boundary.

### Message Protocol

Define a shared types file used by both sides:

```typescript
// src/shared/webviewProtocol.ts  (compiled into both host and webview bundles)

// Messages FROM extension host TO webview
type ExtensionToWebview =
  | { type: "reviewStarted"; prNumber: number }
  | { type: "reviewProgress"; chunk: string }
  | { type: "reviewComplete"; review: ReviewResult }
  | { type: "reviewError"; message: string }
  | { type: "stateSync"; state: WebviewState };

// Messages FROM webview TO extension host
type WebviewToExtension =
  | { type: "requestReview"; prNumber: number }
  | { type: "postToGitHub"; reviewId: number }
  | { type: "sendToPrivanote"; reviewId: number }
  | { type: "ready" }  // webview signals it has loaded
  | { type: "requestState" };  // webview requests full state on reload
```

### State Sync Pattern

Webviews are destroyed and recreated when hidden and re-shown (unless `retainContextWhenHidden` is true — avoid this, it's memory-expensive). Use the "ready handshake" pattern:

```
Webview loads
  → sends { type: "ready" }
  → extension host responds with { type: "stateSync", state: currentState }
  → webview renders from state
```

The extension host is the source of truth. The webview is a pure renderer.

### Webview Panel Structure

```
src/
  webviews/
    AIReviewPanel.ts         — creates/manages the WebviewPanel lifecycle
    webviewProtocol.ts       — shared message types (symlinked/copied to webview bundle)
webviews/
  ai-review/
    index.tsx                — React root
    components/
      ReviewDisplay.tsx      — renders structured review
      ProgressStream.tsx     — live streaming output during generation
      ActionButtons.tsx      — post to GitHub / send to Privanote
    state/
      store.ts               — local state (review, loading, error)
```

### Streaming Output Pattern

For long CLI runs, stream partial output to the webview in real time:

```typescript
// In SubprocessRunner.ts
subprocess.stdout.on("data", (chunk: Buffer) => {
  panel.webview.postMessage({ type: "reviewProgress", chunk: chunk.toString() });
});
```

The webview appends chunks to a `<pre>` element during streaming, then replaces with structured output once parsing completes.

---

## 6. Long-Running CLI Subprocess Management

**Confidence: HIGH** — Node.js child_process patterns in VS Code extension host are well-established.

### Pattern: Async Subprocess with CancellationToken

```typescript
// src/ai/SubprocessRunner.ts
import * as cp from "child_process";
import * as vscode from "vscode";

export class SubprocessRunner {
  async run(
    command: string,
    args: string[],
    stdin: string,
    token: vscode.CancellationToken,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = cp.spawn(command, args, {
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      proc.stdin.write(stdin);
      proc.stdin.end();

      proc.stdout.on("data", (chunk: Buffer) => {
        const str = chunk.toString();
        stdout += str;
        onChunk(str);  // stream to webview
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) resolve(stdout);
        else reject(new Error(`CLI exited ${code}: ${stderr}`));
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to spawn ${command}: ${err.message}`));
      });

      // Respect cancellation
      token.onCancellationRequested(() => {
        proc.kill("SIGTERM");
        reject(new Error("Cancelled"));
      });
    });
  }
}
```

### Key Rules

1. **Never `await` a subprocess on the extension host's main synchronous path.** Register the command handler as `async` and `await` inside it — VS Code's extension host is single-threaded but non-blocking.
2. **Always pass `vscode.CancellationToken`** from the calling command so the user can cancel a long review generation from the progress indicator.
3. **Use `withProgress`** to show a cancellable progress notification:
   ```typescript
   await vscode.window.withProgress(
     { location: vscode.ProgressLocation.Notification, cancellable: true, title: "Generating AI review..." },
     async (progress, token) => {
       return runner.run("claude", args, prompt, token, (chunk) => {
         progress.report({ message: chunk.slice(0, 50) });
         panel.webview.postMessage({ type: "reviewProgress", chunk });
       });
     }
   );
   ```
4. **Timeout guard:** Set a `setTimeout` fallback (e.g., 5 minutes) that kills the process — CLI tools can hang if the model API is unreachable.
5. **CLI availability check at activation:** Run `which claude && which codex` once on activation and show a one-time warning if either is missing.

---

## Recommended Architecture: Component Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTENSION HOST (Node.js)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     UPSTREAM FORK LAYERS (kept as-is)               │   │
│  │                                                                     │   │
│  │  GitHubAuthProvider  →  FolderRepositoryManager  →  PullRequestMgr  │   │
│  │       (auth)                (per-repo)              (PR state)      │   │
│  │                                                                     │   │
│  │  PRsTreeDataProvider  →  ReviewManager  →  CommentController        │   │
│  │   (sidebar tree)         (upstream UI)    (inline comments)         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│                    EXTENSION POINTS (new code hooks in here)               │
│                                 │                                           │
│  ┌──────────────────┐  ┌────────┴───────┐  ┌─────────────────────────┐    │
│  │  SQLiteStore     │  │ AIReview        │  │ MCPClient               │    │
│  │  (persistence)   │  │ Orchestrator    │  │ (Privanote context)     │    │
│  │                  │  │                 │  │                         │    │
│  │  - repos         │  │ PromptBuilder   │  │ - connect()             │    │
│  │  - pull_requests │  │ SubprocessRunner│  │ - queryContext()        │    │
│  │  - reviews       │  │ ReviewParser    │  │ - disconnect()          │    │
│  │  - comments      │  │                 │  │                         │    │
│  │  - analyses      │  │  claude/codex   │  │  Privanote MCP server   │    │
│  │  - mcp_snapshots │  │  (subprocess)   │  │  (subprocess/HTTP)      │    │
│  └──────────────────┘  └────────┬───────┘  └─────────────────────────┘    │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                    AIReviewPanel (WebviewPanel)                      │   │
│  │                 postMessage / onDidReceiveMessage                    │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │  (isolated renderer process)
┌─────────────────────────────────┴───────────────────────────────────────────┐
│                        WEBVIEW (React, sandboxed)                           │
│                                                                             │
│   ProgressStream → ReviewDisplay → ActionButtons (post GitHub / Privanote) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Path: Build Order

The following sequence minimizes blocked work and validates the highest-risk integrations first.

| Order | Layer | Why This Order |
|-------|-------|----------------|
| 1 | **Fork setup + closed/merged PR browsing** | Everything else depends on having working PR data. Validates the fork approach before adding complexity. |
| 2 | **SQLiteStore** | Needed by AI layer and webview. Simple to build, unblocks everything downstream. |
| 3 | **SubprocessRunner + CLI integration** | Highest-risk component — tests whether `claude`/`codex` CLIs produce parseable output. Fail fast here before building the full pipeline. |
| 4 | **PromptBuilder + ReviewParser** | Depends on SubprocessRunner being proved out. Iterative — output format will change. |
| 5 | **AIReviewPanel webview** | Needs ReviewParser output shape to be stable enough to render. |
| 6 | **MCPClient** | Can be built in parallel with 3-5. MCP context is additive — the review pipeline works without it. |
| 7 | **GitHub comment posting** | Low risk; just calls existing GitHub API. Build after the review content is solid. |
| 8 | **Privanote API push** | Pure HTTP call. Build last — depends on review content being finalized. |
| 9 | **Project analysis flow** | One-shot, expensive operation. Build once core review flow is validated. |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Modifying Upstream Core Classes Directly
**What:** Editing `PullRequestManager`, `GitHubRepository`, etc. to add AI logic.
**Why bad:** Every upstream pull creates merge conflicts in the most complex parts of the codebase.
**Instead:** Use composition — accept `PullRequestModel` as input to the AI layer; don't extend it.

### Anti-Pattern 2: Synchronous SQLite Calls on Hot Paths
**What:** Calling `SQLiteStore` inside `TreeDataProvider.getChildren()` synchronously.
**Why bad:** Tree refresh is called frequently; slow DB reads will lag the entire sidebar.
**Instead:** Cache in memory; write-through to SQLite. Only read from SQLite on explicit user action or activation.

### Anti-Pattern 3: `retainContextWhenHidden: true` on the Webview
**What:** Setting this option to avoid the ready-handshake complexity.
**Why bad:** Keeps the webview's renderer process alive even when the panel is hidden; significant memory overhead.
**Instead:** Implement the state sync handshake properly. It's 20 lines of code.

### Anti-Pattern 4: Blocking on MCP Connection at Activation
**What:** `await mcpClient.connect()` in `activate()` before registering anything.
**Why bad:** If the Privanote MCP server is not running, the extension fails to activate entirely.
**Instead:** Lazy-connect MCP on first use. If connection fails, log a warning and generate the review without MCP context.

### Anti-Pattern 5: Storing Raw CLI Output as the Source of Truth
**What:** Only storing raw CLI stdout and parsing on demand.
**Why bad:** CLI output format changes across `claude`/`codex` versions. Old records become unparseable.
**Instead:** Parse immediately after generation and store both `raw_output` (for debugging) and `parsed_content` (as stable JSON). The schema above reflects this.

---

## Scalability Considerations

This is a personal tool. The relevant scalability concern is not load but data volume over time.

| Concern | At 100 reviews | At 10K reviews |
|---------|---------------|----------------|
| SQLite DB size | ~50 MB (fine) | ~5 GB (add pruning/archiving) |
| Project analysis staleness | No issue | Add `updated_at` check, prompt user to refresh |
| MCP server startup latency | Not noticeable | Keep persistent connection |
| Review generation time | 30-120s per review | No change (subprocess is independent) |

---

## Sources

**Note: All sources are training-data knowledge. No live web verification was possible in this session (all external tools disabled). Confidence is MEDIUM for source-specific claims about the upstream repo, HIGH for VS Code API patterns.**

- microsoft/vscode-pull-request-github source tree — training data, stable as of August 2025
- VS Code Extension API: Webview API — https://code.visualstudio.com/api/extension-guides/webview (patterns unchanged since VS Code 1.57)
- VS Code Extension API: TreeView — https://code.visualstudio.com/api/extension-guides/tree-view
- better-sqlite3 documentation — https://github.com/WiseLibs/better-sqlite3
- @modelcontextprotocol/sdk Node.js client — https://github.com/modelcontextprotocol/typescript-sdk (MEDIUM confidence — MCP SDK patterns are from late-2024 training data)
- Node.js child_process documentation — https://nodejs.org/api/child_process.html
