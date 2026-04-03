# Phase 1: Foundation - Research

**Researched:** 2026-04-03
**Domain:** VS Code extension fork setup, better-sqlite3 + electron-rebuild, GitHub PR state browsing, child_process streaming, PATH detection
**Confidence:** HIGH (all critical version claims live-verified against npm registry, GitHub, and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Full fork of `microsoft/vscode-pull-request-github` — keep git history, inherit GitHub auth, Octokit client, PR tree, and diff views
- **D-02:** Strict minimal-diff policy: all new code lives in `src/ai/`, `src/storage/`, `src/mcp/` (new top-level dirs). Never modify `PullRequestManager`, `GitHubRepository`, or auth layers — extend via composition
- **D-03:** Maintain an `easy-review-diff.md` listing every upstream file touched to make future upstream merges manageable
- **D-04:** Flat list with state badge — one unified list, each PR shows a colored state badge (open / closed / merged). No grouped tree nodes by state.
- **D-05:** Two load modes: (1) Auto-list — fetches recent PRs from connected repo automatically (all states); (2) Add by URL — user pastes a GitHub PR URL to load any specific PR (including cross-repo)
- **D-06:** PRs are persistent — they stay in the sidebar and SQLite until explicitly removed by the user
- **D-07:** Removal deletes all data — the PR record and all associated generated content are permanently deleted from SQLite on removal
- **D-08:** Use `better-sqlite3` (native, sync API, WAL mode)
- **D-09:** Build pipeline must include `electron-rebuild` targeting VS Code's Electron version. Validated as the first technical spike before any feature code.
- **D-10:** Abstract storage behind a `StorageAdapter` interface from day one so `sql.js` can be swapped in as emergency fallback
- **D-11:** Initialize DB with `PRAGMA journal_mode=WAL` and `PRAGMA integrity_check` on every extension activation
- **D-12:** Use `child_process.spawn` with stdout streaming — NOT `exec` or `execSync`
- **D-13:** Phase 1 streams output to VS Code's Output Channel (not the webview — that's Phase 2)
- **D-14:** Hard timeout: 5 minutes per CLI call. Register all spawned process handles in `context.subscriptions`. Implement `deactivate()` hook that kills all running processes.
- **D-15:** PATH resolution order: (1) `easyReview.claudePath` user setting, (2) shell-env detection via `shell -i -c 'which claude'`, (3) common locations (`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`). Show clear setup notification on first activation if none found.
- **D-16:** Two separate build targets: `esbuild` for extension host (CommonJS, `vscode` and `better-sqlite3` externalized), `Vite` for webview (browser bundle). Shared types live in `src/shared/`
- **D-17:** Stay on CommonJS — no ESM. VS Code extension host requires CJS.

### Claude's Discretion

- Exact `electron-rebuild` version pinning (verify against current VS Code Electron at implementation time)
- SQLite schema details beyond what's needed for Phase 1 (PRs + basic metadata)
- Specific VS Code notification/badge styling for state badges
- Output Channel formatting for streamed CLI output

### Deferred Ideas (OUT OF SCOPE)

- Review webview panel UI — Phase 2
- Streaming output TO webview — Phase 2 (Phase 1 streams to Output Channel only)
- Structured 6-section review format — Phase 2
- Privanote MCP integration — Phase 3
- GitHub comment posting — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRW-01 | User can view PRs in all states (open, closed, merged) in the VS Code sidebar | GitHub REST API `state=all` parameter; upstream `CategoryTreeNode` + `PRType.All` needs extension to pass `state` to Octokit `pulls.list`; new flat `EasyReviewPRsProvider` alongside upstream tree |
| PRW-02 | User can select any PR and view its diff within VS Code | Upstream `PullRequestModel` already handles diff views; closed/merged PRs have the same diff data structure; inheriting upstream diff view works unchanged |
| DB-01 | All generated content stored in local SQLite database | `better-sqlite3` 12.8.0 + `@electron/rebuild` 4.0.3 (requires Node 22 on build machine — OK since Electron 39 embeds Node 22.22.1); WAL mode; `StorageAdapter` interface |
| DB-02 | Extension shows clear actionable error if SQLite fails to initialize | Activation health check: try-catch around `new Database()`, call `vscode.window.showErrorMessage` with action button; `StorageAdapter` fallback to no-op or sql.js |
| CFG-01 | User can configure path to `claude` CLI executable in VS Code settings | `contributes.configuration` with `easyReview.claudePath` string setting; read via `vscode.workspace.getConfiguration('easyReview').get('claudePath')` |
| CFG-02 | Extension shows clear setup notification on first activation if `claude` CLI not found in PATH | PATH resolution chain (settings → shell spawn → common paths); store detection result in `context.globalState`; `vscode.window.showWarningMessage` with "Configure Path" action |
</phase_requirements>

---

## Summary

Phase 1 establishes the complete integration chain: fork setup, all-states PR browsing, SQLite persistence, and a streaming subprocess call to the `claude` CLI. All three blocking risks — native module ABI, PATH detection, and fork divergence — are addressed in this phase before any feature complexity is added.

The critical version updates from prior research: VS Code is now on **Electron 39.8.5** (released 2026-03-26) which embeds **Node.js 22.22.1**. This obsoletes the "Node 20 LTS" claim in prior research. `@types/node` must be `~22.x`, and `@electron/rebuild` 4.0.3 (Node 22 required, ESM CLI) is correct. `better-sqlite3` is at **12.8.0**. The upstream fork now uses **webpack** (not pure esbuild) with an optional esbuild-loader flag — the two-target build plan must adapt.

The upstream `PRType.All` + `CategoryTreeNode` + `getAllPullRequests()` chain fetches only open PRs by default because `octokit.api.pulls.list` defaults to `state: 'open'`. Extending to closed/merged requires adding a new provider (not modifying the upstream tree) that calls `pulls.list` with `state: 'all'` or `state: 'closed'`.

**Primary recommendation:** Start with the electron-rebuild spike on day one. If `better-sqlite3` 12.8.0 does not compile against Electron 39 ABI, nothing else can proceed. Run the spike before writing any storage code.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.4.x | Primary language | Required by upstream fork; structural types, strict null checks |
| `@types/node` | `~22.x` | Node type definitions | **Must match Electron 39's embedded Node 22.22.1**, not system Node |
| `@types/vscode` | `^1.110.0` | VS Code API types | Match upstream `engines.vscode: "^1.110.0"` |
| `better-sqlite3` | `^12.8.0` | SQLite driver | Sync API, WAL mode; latest as of 2026-03-13 |
| `@electron/rebuild` | `^4.0.3` | Rebuild native addon for Electron | Required dev-build tool; requires Node 22 on build machine (OK — Electron 39 has Node 22) |
| `child_process` | (Node built-in) | CLI subprocess runner | Streaming spawn for claude CLI |
| `readline` | (Node built-in) | Line-buffer subprocess stdout | Parse stream-json output line by line |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vscode/vsce` | `^3.7.1` | Package into .vsix | Packaging and local install |
| `@vscode/test-electron` | `^2.5.2` | Integration test runner | Runs real VS Code instance for extension tests |
| `mocha` | `^11.7.5` | Unit test runner | Upstream uses mocha; keep for consistency |
| webpack | (upstream inherits) | Extension host bundler | Use upstream's webpack.config.js, do not replace |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@electron/rebuild` 4.x | `@electron/rebuild` 3.7.2 | 3.x works with older Node but Electron 39 requires the Node 22 runtime for native addon headers; 4.x is correct |
| webpack (upstream) | esbuild | Upstream has migrated to webpack with optional esbuild-loader; plan D-16 specifies esbuild for extension host but the upstream uses webpack — fork can use esbuild for new code only, or inherit webpack |
| Inline shell spawn for PATH | `fix-path` 5.x or `shell-env` 4.x | Both packages are ESM-only; incompatible with the CJS extension host; use inline `child_process.execSync` with `/bin/zsh -i -c 'which claude'` instead |

**Installation:**
```bash
npm install --save-dev @electron/rebuild
npm install better-sqlite3
# Spike rebuild command (run after npm install):
./node_modules/.bin/electron-rebuild -v 39.8.5 -w better-sqlite3
```

**Version verification (live-verified 2026-04-03):**
```
better-sqlite3   12.8.0   (npm view better-sqlite3 version)
@electron/rebuild 4.0.3   (npm view @electron/rebuild version)
@vscode/vsce     3.7.1    (npm view @vscode/vsce version)
@types/vscode    1.110.0  (npm view @types/vscode version)
@vscode/test-electron 2.5.2 (npm view @vscode/test-electron version)
mocha            11.7.5   (npm view mocha version)
```

---

## Architecture Patterns

### Recommended Project Structure for Phase 1

```
easy-review/                         # fork root
  src/
    extension.ts                     # MODIFIED: add EasyReview activation call
    easy-review/                     # ALL NEW CODE lives here
      activation.ts                  # top-level activate/deactivate hook
      storage/
        StorageAdapter.ts            # interface (allows sql.js fallback)
        SQLiteStore.ts               # implements StorageAdapter via better-sqlite3
        schema.ts                    # CREATE TABLE statements as string constants
        migrations.ts                # version-based migration runner
        types.ts                     # DB row types
      providers/
        EasyReviewPRsProvider.ts     # new TreeDataProvider for flat PR list
        PRTreeItem.ts                # TreeItem with state badge
      github/
        AllStatesPRFetcher.ts        # wraps FolderRepositoryManager, calls pulls.list state=all
        PRUrlParser.ts               # parses GitHub PR URL → owner/repo/number
      cli/
        PathResolver.ts              # PATH detection chain
        SubprocessRunner.ts          # child_process.spawn wrapper with cancel + timeout
        OutputChannelReporter.ts     # streams CLI output to VS Code Output Channel
      shared/
        constants.ts                 # timeout values, channel names, setting keys
  easy-review-diff.md                # list every upstream file touched
```

### Pattern 1: Flat PR TreeDataProvider (New, No Upstream Modification)

**What:** A new `vscode.TreeDataProvider<PRTreeItem>` registered alongside (not replacing) the upstream tree. It owns its own tree view registered under a new view container ID.

**When to use:** Always — this is the primary UI for Phase 1.

**Key implementation note:** The upstream `PullRequestsTreeDataProvider` must NOT be modified. Register a second tree view using `vscode.window.createTreeView('easy-review.prList', ...)`.

```typescript
// Source: VS Code TreeDataProvider API
// src/easy-review/providers/EasyReviewPRsProvider.ts
import * as vscode from 'vscode';
import { PRTreeItem } from './PRTreeItem';

export class EasyReviewPRsProvider implements vscode.TreeDataProvider<PRTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PRTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private prs: PRTreeItem[] = [];

  getTreeItem(element: PRTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PRTreeItem): vscode.ProviderResult<PRTreeItem[]> {
    if (!element) return this.prs;
    return [];
  }

  refresh(prs: PRTreeItem[]): void {
    this.prs = prs;
    this._onDidChangeTreeData.fire(undefined);
  }
}
```

### Pattern 2: GitHub API — Fetching All PR States

**What:** The upstream `getAllPullRequests()` calls `octokit.api.pulls.list` without a `state` parameter, defaulting to `state: 'open'`. Fetching closed and merged PRs requires passing `state: 'all'` (GitHub REST API returns open + closed + merged when `state=all`; merged PRs have `merged_at !== null` and `state === 'closed'`).

**Key insight:** GitHub's REST API does not have a `state: 'merged'` option. Merged PRs are retrieved with `state: 'closed'` or `state: 'all'` and identified by `merged_at !== null`. The upstream `GithubItemStateEnum` already defines `Merged = 'MERGED'` for GraphQL use — use this in the local model.

```typescript
// Source: GitHub REST API docs (GET /repos/{owner}/{repo}/pulls)
// src/easy-review/github/AllStatesPRFetcher.ts
import { Octokit } from '@octokit/rest';

interface FetchOptions {
  owner: string;
  repo: string;
  perPage?: number;
  page?: number;
}

export async function fetchAllStatePRs(octokit: Octokit, opts: FetchOptions) {
  const { data } = await octokit.rest.pulls.list({
    owner: opts.owner,
    repo: opts.repo,
    state: 'all',            // returns open + closed + merged
    per_page: opts.perPage ?? 50,
    page: opts.page ?? 1,
    sort: 'updated',
    direction: 'desc',
  });

  return data.map(pr => ({
    number: pr.number,
    title: pr.title,
    state: pr.merged_at ? 'merged' : pr.state,  // differentiate merged from closed
    author: pr.user?.login ?? '',
    url: pr.html_url,
    raw: pr,
  }));
}

// For "Add by URL" single-PR fetch:
export async function fetchPRByNumber(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
) {
  const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
  return data;
}
```

### Pattern 3: PATH Resolution (CJS-Safe, No ESM Dependencies)

**What:** Detect the `claude` binary path without using ESM-only packages (`fix-path`, `shell-env`). Use synchronous shell spawn directly.

**Critical constraint:** `fix-path` 5.x and `shell-env` 4.x are ESM-only. Do not use them in the CJS extension host. Use the inline approach below.

```typescript
// Source: Node.js child_process docs + VS Code PATH detection community pattern
// src/easy-review/cli/PathResolver.ts
import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as vscode from 'vscode';

const COMMON_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  `${os.homedir()}/.local/bin`,
  `${os.homedir()}/.nvm/versions/node/current/bin`,
];

export function resolveClaudePath(): string | undefined {
  // 1. User-configured path takes priority
  const configured = vscode.workspace.getConfiguration('easyReview').get<string>('claudePath');
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  // 2. Shell-env detection: source the user's shell to get the real PATH
  try {
    const shell = process.env.SHELL ?? '/bin/zsh';
    const result = execSync(`"${shell}" -i -c 'which claude'`, {
      encoding: 'utf8',
      timeout: 5000,
      env: { HOME: os.homedir(), PATH: process.env.PATH ?? '' },
    }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // shell detection failed — continue to fallback
  }

  // 3. Common install locations
  for (const dir of COMMON_PATHS) {
    const candidate = `${dir}/claude`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
```

### Pattern 4: SubprocessRunner with Streaming to Output Channel

**What:** Spawn the `claude` CLI with `--print --output-format stream-json`, stream JSON events to VS Code Output Channel, respect cancellation, enforce timeout.

**claude CLI flags verified (claude 2.1.87):**
- `-p` / `--print`: non-interactive mode, required for subprocess use
- `--output-format stream-json`: streams newline-delimited JSON events to stdout (requires `--print`)
- `--include-partial-messages`: include partial chunks as they arrive

```typescript
// Source: Node.js child_process API + verified claude --help output
// src/easy-review/cli/SubprocessRunner.ts
import * as cp from 'child_process';
import * as readline from 'readline';
import * as vscode from 'vscode';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (D-14)

export interface RunOptions {
  prompt: string;
  token: vscode.CancellationToken;
  outputChannel: vscode.OutputChannel;
}

export async function runClaudeStreaming(
  claudePath: string,
  opts: RunOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn(
      claudePath,
      ['--print', '--output-format', 'stream-json', '--include-partial-messages'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let fullOutput = '';
    const rl = readline.createInterface({ input: proc.stdout! });

    rl.on('line', (line) => {
      try {
        const event = JSON.parse(line);
        // stream-json events: {type: 'text', text: '...'} | {type: 'result', result: '...'}
        if (event.type === 'text' || event.type === 'result') {
          opts.outputChannel.append(event.text ?? event.result ?? '');
          fullOutput += event.text ?? event.result ?? '';
        }
      } catch {
        // non-JSON line (e.g., progress info) — append raw
        opts.outputChannel.appendLine(line);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      opts.outputChannel.appendLine(`[stderr] ${chunk.toString()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(fullOutput);
      else reject(new Error(`claude exited with code ${code}`));
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    // Write prompt to stdin
    proc.stdin!.write(opts.prompt);
    proc.stdin!.end();

    // Cancellation (D-14)
    opts.token.onCancellationRequested(() => {
      proc.kill('SIGTERM');
      reject(new Error('Cancelled by user'));
    });

    // Hard timeout (D-14)
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Claude CLI timed out after 5 minutes'));
    }, TIMEOUT_MS);

    proc.on('close', () => clearTimeout(timer));
  });
}
```

### Pattern 5: StorageAdapter Interface + SQLiteStore

**What:** Abstract the SQLite store behind an interface so `sql.js` can replace `better-sqlite3` if ABI matching fails (D-10). Phase 1 only needs the PRs table.

```typescript
// Source: Architecture decision D-10
// src/easy-review/storage/StorageAdapter.ts
export interface StorageAdapter {
  initialize(): void;
  savePR(pr: StoredPR): void;
  getPRs(): StoredPR[];
  getPR(repoId: string, prNumber: number): StoredPR | undefined;
  deletePR(repoId: string, prNumber: number): void;
  close(): void;
}

// src/easy-review/storage/SQLiteStore.ts
import Database from 'better-sqlite3';
import * as vscode from 'vscode';
import type { StorageAdapter } from './StorageAdapter';
import { PR_TABLE_DDL } from './schema';

export class SQLiteStore implements StorageAdapter {
  private db!: Database.Database;

  initialize(storagePath: string): void {
    // DB-02: health check — surface ABI mismatch as actionable error
    try {
      this.db = new Database(`${storagePath}/easy-review.db`);
      this.db.pragma('journal_mode = WAL');  // D-11
      this.db.pragma('integrity_check');     // D-11
      this.db.exec(PR_TABLE_DDL);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(
        `Easy Review: SQLite failed to initialize. ${msg}. ` +
        'This may be a native module ABI mismatch. Try reloading VS Code or rebuilding the extension.',
        'Open Output'
      );
      throw err;
    }
  }
  // ... rest of implementation
}
```

### Pattern 6: Parsing GitHub PR URLs

**What:** Parse `https://github.com/{owner}/{repo}/pull/{number}` URLs for "Add by URL" feature (D-05).

```typescript
// Source: GitHub URL format specification
// src/easy-review/github/PRUrlParser.ts
export interface ParsedPRUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

export function parsePRUrl(url: string): ParsedPRUrl | null {
  const match = url.trim().match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
  };
}
```

### Anti-Patterns to Avoid

- **Modify upstream `PullRequestsTreeDataProvider`:** Register a new tree view alongside it instead. See D-02.
- **Use `fix-path` or `shell-env` npm packages:** Both are ESM-only. Use inline `execSync` shell spawn.
- **Use `@electron/rebuild` v3.x for Electron 39:** v3.x requires Node 12+ but Electron 39 has Node 22 headers; use v4.x.
- **Pass `state: 'merged'` to GitHub REST API:** Not a valid value. Use `state: 'all'` and detect merged by `merged_at !== null`.
- **Buffer all subprocess stdout before processing:** Use `readline` on the stream; large outputs will OOM.
- **Open SQLite in `activate()` synchronously on the main path:** Open lazily on first command or defer post-registration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub OAuth + token management | Custom auth flow | Upstream fork's existing auth provider | Already battle-tested; creating a competing auth provider causes VS Code session conflicts (Pitfall 6) |
| PR diff view UI | Custom diff renderer | Upstream `PullRequestModel.getDiffFiles()` + VS Code `commands.executeCommand('vscode.diff', ...)` | Diff views are built into VS Code; upstream already wires them to PR data |
| SQLite WAL + migration management | Custom file locking | `better-sqlite3` WAL pragma + version table pattern | WAL mode is a single PRAGMA call; hand-rolled locking is error-prone |
| Octokit HTTP client + pagination | Custom GitHub API calls | Upstream's `GitHubRepository.octokit` instance | Reuse the authenticated Octokit instance the fork already owns |
| subprocess timeout / cancellation | Custom timer logic | `CancellationToken` + `setTimeout` calling `proc.kill('SIGTERM')` | Well-established pattern; see Pattern 4 |
| Binary PATH discovery | Custom registry lookups | Inline `execSync('/bin/zsh -i -c "which claude"')` | The only reliable way on macOS GUI apps; all npm packages for this are ESM-only |

**Key insight:** The fork gives Phase 1 GitHub auth, diff views, and PR data access for free. New code should only add what the fork doesn't have: all-states browsing, persistence, and subprocess management.

---

## Common Pitfalls

### Pitfall 1: electron-rebuild Targets Wrong Electron Version
**What goes wrong:** Running `electron-rebuild` without specifying `-v` uses the locally installed Electron (from `devDependencies`), which may not match what VS Code ships. The `.node` binary compiles but fails at runtime in VS Code.
**Why it happens:** The build machine may have a different Electron version than VS Code's embedded runtime.
**How to avoid:** Always pass `-v 39.8.5` (or whatever `process.versions.electron` returns in the VS Code extension host). Add the version to the spike script and pin it. Check `process.versions.electron` at extension activation and log it.
**Warning signs:** "NODE_MODULE_VERSION mismatch" or "Invalid ELF header" in the extension host console.

### Pitfall 2: `@electron/rebuild` 4.x is ESM CLI but CJS API
**What goes wrong:** Trying to `require('@electron/rebuild')` in a CJS build script fails if you import incorrectly from the CJS API.
**Why it happens:** v4.0.0 introduced ESM as primary format but retains CJS export. The CLI works as `./node_modules/.bin/electron-rebuild`. The JS API is `import { rebuild } from '@electron/rebuild'` or the CJS `const { rebuild } = require('@electron/rebuild')`.
**How to avoid:** Use the CLI (`./node_modules/.bin/electron-rebuild -v 39.8.5 -w better-sqlite3`) in npm scripts — never import it programmatically in the extension. It is a dev build tool only.

### Pitfall 3: GitHub REST API State='merged' Does Not Exist
**What goes wrong:** Passing `state: 'merged'` to `octokit.rest.pulls.list` returns an API error.
**Why it happens:** GitHub REST API only accepts `state: 'open' | 'closed' | 'all'`. Merged PRs are a subset of `closed` (identified by `merged_at !== null`).
**How to avoid:** Use `state: 'all'`, then set `state = pr.merged_at ? 'merged' : pr.state` in the mapping layer.

### Pitfall 4: PATH Detection via `shell -i` Hangs on Slow Shell Init
**What goes wrong:** `execSync('/bin/zsh -i -c "which claude"', { timeout: 5000 })` hangs when the user has a slow `.zshrc` (e.g., heavy `nvm`, `rbenv`, or conda initialization).
**Why it happens:** Interactive shell init can take 3-10 seconds on machines with heavy shell configurations.
**How to avoid:** Always use `timeout: 5000` (or less). Catch the timeout error and fall through to common path checks. Log the failure at DEBUG level so users can diagnose.

### Pitfall 5: Both Easy Review and Microsoft GH PR Extension Installed Simultaneously
**What goes wrong:** Auth provider conflicts, duplicate sidebar views, command palette confusion.
**Why it happens:** The fork registers the same provider IDs as the upstream extension.
**How to avoid:** Change `publisher` and `name` in `package.json` immediately after forking. Use `vscode.authentication.getSession('github', scopes)` to consume the existing session rather than re-registering an auth provider. Clearly document that this extension replaces (not supplements) the upstream.

### Pitfall 6: `better-sqlite3` in vsix Includes Platform-Wrong Binary
**What goes wrong:** Package built on macOS ARM contains an ARM64 `.node` file; Windows users who install the vsix get an error at extension activation.
**Why it happens:** `vsce package` bundles whatever is in `node_modules/better-sqlite3/build/Release/`.
**How to avoid:** This is a Phase 4 concern for Marketplace distribution. For Phase 1 development, document that the vsix is developer-only (local install via `code --install-extension`). The per-platform build pipeline is deferred to Phase 4.

### Pitfall 7: `easy-review-diff.md` Not Started Before First Upstream File Touch
**What goes wrong:** Upstream files are modified without tracking, making future merges undiscoverable.
**Why it happens:** It feels like overhead until the first upstream merge shows how painful it is.
**How to avoid:** Create `easy-review-diff.md` as the very first file committed. Add an entry before touching any upstream file. This is Wave 0 work.

---

## Fork Setup Specifics

### Verified Upstream State (2026-04-03)

| Property | Value | Source |
|----------|-------|--------|
| Extension version | 0.134.0 | package.json |
| engines.vscode | `^1.110.0` | package.json |
| Publisher | GitHub | package.json |
| Bundler | webpack (webpack.config.js) with optional esbuild-loader | webpack.config.js |
| Node requirement | `>=20` | package.json |
| Key class for PR listing | `CategoryTreeNode` | src/view/treeNodes/categoryNode.ts |
| Key class for tree | `PullRequestsTreeDataProvider` | src/view/prsTreeDataProvider.ts |
| PR state enum | `GithubItemStateEnum { Open='OPEN', Merged='MERGED', Closed='CLOSED' }` | src/github/interface.ts |
| PR type enum | `PRType { Query, All, LocalPullRequest }` | src/github/interface.ts |
| PR fetch method | `getAllPullRequests(page?)` calls `octokit.api.pulls.list` without state filter | src/github/githubRepository.ts |

### Fork Steps (Ordered)

1. Clone `microsoft/vscode-pull-request-github` with full history (`git clone`, no `--depth`)
2. Rename in `package.json`: set `publisher`, `name`, `displayName` to Easy Review values
3. Create `easy-review-diff.md` — log every upstream file touched hereafter
4. Run `npm install` then `electron-rebuild` spike (see Validation Architecture below)
5. Create `src/easy-review/` directory tree
6. Modify only `src/extension.ts` to add `activateEasyReview(context)` call — log this in `easy-review-diff.md`
7. Add new `contributes.views` entry (new view container, new tree view ID) in `package.json` — additive, not replacing

### Build Pipeline Clarification (D-16 vs Upstream Reality)

The upstream now uses **webpack** (webpack.config.js), not pure esbuild. D-16 specifies esbuild for the extension host. The resolution:

- Use the upstream's webpack config for the upstream code (inherit as-is)
- Add a **separate esbuild config** (`esbuild.easy-review.js`) for the `src/easy-review/` subsystem only, or integrate into webpack
- For Phase 1, the simplest approach: inherit webpack, add the new files to webpack entry. Do NOT introduce a parallel esbuild build that duplicates the upstream webpack output.
- The Vite build for webviews remains separate (Phase 2 concern)

---

## Runtime State Inventory

This is a greenfield fork setup. No existing runtime state to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no existing database | Create new `easy-review.db` on first activation |
| Live service config | None | N/A |
| OS-registered state | None | N/A |
| Secrets/env vars | None | N/A |
| Build artifacts | None — repo not yet cloned | Fork and `npm install` from scratch |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build scripts, electron-rebuild | Yes | 20.19.1 (system) | — |
| npm | Package installation | Yes | (bundled with Node) | — |
| `claude` CLI | CFG-01, CFG-02, subprocess test | Yes | 2.1.87 (Claude Code) at `~/.local/bin/claude` | Show setup notification per CFG-02 |
| git | Fork clone | Expected (not verified) | — | Install via Homebrew |
| VS Code 1.110+ | Extension host / tests | Expected (dev machine) | — | Update VS Code |

**Note:** `claude` 2.1.87 is the Claude Code CLI, not the Anthropic API CLI. The subprocess invocation (`--print --output-format stream-json`) is verified to be supported by this version. If users have a different `claude` CLI variant, output format flags should be checked.

**Missing dependencies with no fallback:** None that block Phase 1 development.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | mocha 11.7.5 + `@vscode/test-electron` 2.5.2 |
| Config file | `.mocharc.yml` (inherits from upstream) — must verify at fork time |
| Quick run command | `npm run test:unit` (unit tests, no VS Code instance) |
| Full suite command | `npm run test` (uses `@vscode/test-electron`, launches VS Code) |

### electron-rebuild Spike (Wave 0 Gate)

**This must pass before writing any storage code.** Create a standalone spike script:

```bash
# spike/test-sqlite-rebuild.sh
cd /path/to/easy-review
npm install better-sqlite3 --save
./node_modules/.bin/electron-rebuild -v 39.8.5 -w better-sqlite3 -f
node -e "
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT)');
  db.prepare('INSERT INTO test (val) VALUES (?)').run('hello');
  const row = db.prepare('SELECT * FROM test').get();
  console.log('SQLite spike PASSED:', row);
  db.close();
"
```

If this fails, the Electron version in the spike script is wrong or `better-sqlite3` doesn't yet support Electron 39. In that case: try rebuilding without `-v` (uses installed Electron), or fall back to `sql.js` per D-10.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | SQLite opens, WAL mode set, tables created | Unit | `npm run test:unit -- --grep "SQLiteStore"` | Wave 0 |
| DB-02 | Activation shows error if SQLite fails to init | Integration | `npm run test -- --grep "SQLite init failure"` | Wave 0 |
| CFG-01 | `easyReview.claudePath` setting read correctly | Unit | `npm run test:unit -- --grep "PathResolver"` | Wave 0 |
| CFG-02 | Setup notification shown when claude not in PATH | Integration | `npm run test -- --grep "claude not found"` | Wave 0 |
| PRW-01 | PRs in all states appear in tree view | Integration | `npm run test -- --grep "EasyReviewPRsProvider"` | Wave 0 |
| PRW-02 | Selecting PR opens diff view | Integration | Manual (requires GitHub auth) | Manual only |

### Integration Test Approach for Full Chain

The full chain test: fork → SQLite → subprocess → Output Channel. This cannot be unit tested (requires VS Code, GitHub auth, and `claude` binary). Document as a manual smoke test:

```
Manual: Phase 1 Chain Validation
1. Load extension in Extension Development Host (F5)
2. Open a repo with GitHub remote
3. Verify "Easy Review" panel appears in sidebar
4. Verify open, closed, and merged PRs appear with state badges
5. Select any PR → verify VS Code diff editor opens
6. Open Command Palette → "Easy Review: Test Claude CLI"
7. Verify Output Channel "Easy Review" opens and shows streaming output
8. Verify proper error shown if claude is not found (temporarily rename binary)
9. Verify proper error shown if SQLite fails (mount read-only dir temporarily)
```

### Wave 0 Gaps

- [ ] `src/test/unit/storage/SQLiteStore.test.ts` — covers DB-01, DB-02
- [ ] `src/test/unit/cli/PathResolver.test.ts` — covers CFG-01, CFG-02
- [ ] `src/test/unit/github/PRUrlParser.test.ts` — covers PRW-01 URL parsing
- [ ] `src/test/integration/EasyReviewPRsProvider.test.ts` — covers PRW-01 tree display
- [ ] `spike/test-sqlite-rebuild.sh` — electron-rebuild validation (must run before Wave 1)
- [ ] Framework install: inherited from upstream mocha setup — verify `.mocharc.yml` exists after fork

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| VS Code embeds Node 18-20 LTS | VS Code embeds Node 22.22.1 (Electron 39) | Electron 39.8.5, 2026-03-26 | `@types/node` must be `~22.x`; `@electron/rebuild` 4.x (Node 22 required) is now correct |
| `better-sqlite3` ^9.4.x | `better-sqlite3` ^12.8.0 | 2026-03-13 | Version pin must be updated; API unchanged |
| `@electron/rebuild` ^3.x | `@electron/rebuild` ^4.0.3 | 2026-01-27 | Requires Node 22 on build machine; ESM CLI but CJS API available; use CLI form in npm scripts |
| Upstream uses esbuild | Upstream uses webpack + optional esbuild-loader | Detected 2026-04-03 | D-16 plan to use esbuild standalone needs revision; inherit upstream webpack instead |
| `fix-path` / `shell-env` for PATH detection | Inline `execSync` shell spawn | Both packages went ESM-only | Cannot `require()` ESM packages in CJS extension host; inline shell spawn is the correct approach |
| `state: 'merged'` in GitHub API | `state: 'all'` + `merged_at !== null` check | GitHub API always | Never had a `merged` state in REST API; must derive from `merged_at` |

---

## Open Questions

1. **`better-sqlite3` 12.8.0 + Electron 39.8.5 compatibility**
   - What we know: `better-sqlite3` 12.8.0 released 2026-03-13; Electron 39.8.5 released 2026-03-26; GitHub release notes mention "Electron v121 and v123" support
   - What's unclear: Whether "v121" and "v123" refer to Electron versions or Chromium versions; Electron 39 corresponds to what Chromium/Node module version
   - Recommendation: The spike script settles this empirically. If it fails, try `better-sqlite3` latest or fall back to `sql.js` per D-10.

2. **Upstream webpack vs esbuild for new code**
   - What we know: Upstream uses webpack.config.js; D-16 specifies esbuild for the extension host
   - What's unclear: Whether adding esbuild alongside webpack creates conflicts or unnecessary complexity
   - Recommendation: For Phase 1, integrate new `src/easy-review/` files into the upstream webpack config. Revisit the esbuild decision in Phase 2 when the build system is better understood.

3. **Accessing the upstream's Octokit instance**
   - What we know: `GitHubRepository` owns an authenticated Octokit instance; `FolderRepositoryManager` manages repos per workspace folder
   - What's unclear: The exact public API to obtain the Octokit instance from the extension's exported API without modifying upstream files
   - Recommendation: Read `src/github/folderRepositoryManager.ts` at fork time to find the public accessor. If no clean public API exists, read it from the extension's exported `activate()` return value.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md contains project context and stack documentation (auto-injected by GSD). Actionable directives for Phase 1:

- **TypeScript + VS Code Extension API:** Required; no alternative runtime
- **better-sqlite3 or similar:** Specified for local SQLite storage
- **Inherit GitHub auth from fork:** Do not implement separate auth flow
- **VS Code 1.85+ compatibility:** engines.vscode baseline (note: upstream is now at 1.110.0 — use that)
- **GSD workflow enforcement:** All file changes via GSD workflow commands (`/gsd:execute-phase`)

---

## Sources

### Primary (HIGH confidence)
- `npm view better-sqlite3 version` → 12.8.0 (verified live 2026-04-03)
- `npm view @electron/rebuild version` → 4.0.3 (verified live 2026-04-03)
- `npm view @vscode/vsce version` → 3.7.1 (verified live 2026-04-03)
- `npm view @types/vscode version` → 1.110.0 (verified live 2026-04-03)
- `npm view @vscode/test-electron version` → 2.5.2 (verified live 2026-04-03)
- `npm view mocha version` → 11.7.5 (verified live 2026-04-03)
- GitHub releases.electronjs.org: Electron 39.8.5 embeds Node 22.22.1 (verified live 2026-04-03)
- microsoft/vscode package.json: `"electron": "39.8.5"` in devDependencies (verified live 2026-04-03)
- github.com/electron/rebuild releases: v4.0.3 latest, Node 22 required (verified live 2026-04-03)
- GitHub REST API docs: `GET /repos/{owner}/{repo}/pulls` — `state` param accepts `open|closed|all` (verified live 2026-04-03)
- `claude --help` (2.1.87): `--print`, `--output-format stream-json`, `--include-partial-messages` flags confirmed (verified live 2026-04-03)
- microsoft/vscode-pull-request-github interface.ts: `GithubItemStateEnum`, `PRType` enums (verified live 2026-04-03)
- microsoft/vscode-pull-request-github package.json: `engines.vscode: "^1.110.0"`, version 0.134.0 (verified live 2026-04-03)

### Secondary (MEDIUM confidence)
- microsoft/vscode-pull-request-github githubRepository.ts: `getAllPullRequests()` method signature (fetched but not full file)
- microsoft/vscode-pull-request-github categoryNode.ts: `PRType.All` → `getAllPullRequests()` flow (fetched summary)
- microsoft/vscode-pull-request-github prsTreeDataProvider.ts: `PullRequestsTreeDataProvider` class structure (fetched summary)
- microsoft/vscode-pull-request-github webpack.config.js: three-target build (node/webworker/webviews) (fetched summary)

### Tertiary (LOW confidence — verify at fork time)
- Exact public API to obtain Octokit instance from `FolderRepositoryManager` without upstream modification
- Whether `better-sqlite3` 12.8.0 has been tested against Electron 39 specifically (release notes mention "v121/v123" which may be module version numbers, not Electron versions)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all version numbers live-verified against npm registry (2026-04-03)
- Architecture: HIGH — VS Code TreeDataProvider, child_process patterns are stable API; fork structure fetched live
- Fork-specific class names: MEDIUM — fetched via WebFetch summaries; verify exact signatures at clone time
- Pitfalls: HIGH — macOS PATH, native ABI mismatch, GitHub API state behavior all confirmed

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries; re-check `better-sqlite3` + Electron compatibility at implementation time)

**Critical action before Wave 1:** Run the electron-rebuild spike. Do not write storage code until `better-sqlite3` 12.8.0 loads successfully in the VS Code extension host against Electron 39.
