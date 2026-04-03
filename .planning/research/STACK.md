# Stack Research

**Project:** Easy Review (VS Code extension fork of microsoft/vscode-pull-request-github)
**Researched:** 2026-04-03
**Research method:** Training knowledge (cutoff Aug 2025) — no live web access available during this session. All claims marked with confidence level. Verify versions against official sources before locking in.

---

## Runtime & Language

### Recommendation: TypeScript 5.4+ on Node 20 LTS

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.4.x | Primary language | Required — upstream fork is TypeScript. Structural types, strict null checks, and const enums are used throughout the upstream codebase. |
| Node.js | 20 LTS (Electron-hosted) | Runtime | VS Code embeds its own Electron/Node runtime. Your extension code runs in that context, not system Node. Node 20 is what VS Code 1.85–1.96 embeds. |
| `@types/node` | `~20.x` | Node type definitions | Must match the Electron-embedded Node version, not the system Node version. Mismatching this causes subtle type errors on `child_process`, `fs`, etc. |

**Confidence: HIGH** — TypeScript is non-negotiable for the fork. The Node version is tied to VS Code's Electron version; VS Code 1.85+ uses Electron 27–29 which embeds Node 18–20. Node 20 LTS is the safe target for new work as of 2025.

**Key constraint:** The extension runs inside VS Code's Node, not the system Node. Never rely on system Node version for compatibility — check `process.versions.node` at runtime if you need to guard.

### tsconfig baseline

Inherit from the upstream fork's `tsconfig.json`. It uses:
- `"module": "commonjs"` — required for VS Code extension host (ESM support in extensions is experimental as of VS Code 1.96)
- `"target": "ES2022"` — safe for the embedded Node 20
- `"strict": true` — keep this; the upstream uses it

**Do NOT switch to ESM modules** — VS Code's extension host loader still requires CommonJS for extensions. This is a known long-standing constraint. ESM support is under active development but not stable for general use as of my knowledge cutoff.

---

## VS Code Extension Tooling

### Recommendation: Inherit upstream toolchain (esbuild + npm)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@vscode/vsce` | `^2.x` | Packaging + publishing | Official Microsoft tool for `.vsix` packaging. Required for VS Code Marketplace submission. |
| `@types/vscode` | `^1.85.0` | VS Code API types | Set `engines.vscode` to `"^1.85.0"` in `package.json` to match upstream baseline. |
| `esbuild` | `^0.20.x` | Extension bundler | The upstream vscode-pull-request-github already uses esbuild. Stick with it — do not introduce webpack unless the upstream switches. Faster builds, simpler config. |
| `yo` + `generator-code` | latest | Scaffolding (reference only) | Not needed since we are forking, not scaffolding from scratch. Useful to read generated templates to understand conventions. |
| `@vscode/test-electron` | `^2.x` | Integration testing | Official test runner for VS Code extensions. Runs a real VS Code instance during tests. |
| `mocha` | `^10.x` | Unit test runner | What the upstream uses. Keep it for consistency. |

**Confidence: HIGH** — esbuild and the `@vscode/*` toolchain are the established 2024-2025 standard for VS Code extensions.

### Fork-specific setup

When forking microsoft/vscode-pull-request-github:
1. Clone the repo, do NOT use `git subtree` or shallow clone — you need full history for rebasing upstream changes.
2. Rename the extension ID in `package.json` immediately (`publisher` + `name`) to avoid conflicts with the upstream marketplace listing.
3. Keep the upstream's `contributes.commands`, `contributes.views`, and `contributes.authentication` sections intact — these wire up GitHub auth that you depend on.
4. Add your new commands/views in an additive `contributes` block rather than replacing existing ones.

**Confidence: HIGH** — standard fork hygiene, not version-sensitive.

---

## SQLite in VS Code Extensions

### Recommendation: `better-sqlite3` with electron-rebuild

This is the most complex stack decision. SQLite in a VS Code extension requires a native Node addon compiled for Electron's ABI, not regular Node's ABI.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `better-sqlite3` | `^9.4.x` | SQLite driver | Synchronous API — critical for VS Code extensions. The extension host is single-threaded; async SQLite drivers (`node-sqlite3`, `sql.js`) add complexity. better-sqlite3's sync API is simpler and safer here. |
| `electron-rebuild` | `^3.x` | Rebuild native addon for Electron | Must rebuild better-sqlite3 against VS Code's Electron version. This is non-negotiable for native addons. |
| `@electron/rebuild` | `^3.x` | Newer name for electron-rebuild | Same package, new scoped name. Use whichever matches Electron version guidance. |

**Confidence: MEDIUM** — better-sqlite3 is the right choice architecturally. The rebuild step is well-documented but version numbers of better-sqlite3 and the electron-rebuild tooling should be verified against the VS Code Electron version at implementation time.

### The native addon problem — full explanation

VS Code ships its own Electron. Native Node addons (`.node` files) are compiled for a specific Node ABI. The ABI inside VS Code's Electron differs from system Node. If you `npm install better-sqlite3` and bundle it, it will crash at runtime with "Invalid ELF header" or "NODE_MODULE_VERSION mismatch".

**Required build step:**
```bash
# After npm install, rebuild for VS Code's Electron version
./node_modules/.bin/electron-rebuild -v [VSCODE_ELECTRON_VERSION] -t electron -m ./node_modules/better-sqlite3
```

The VS Code Electron version is found in VS Code's `package.json` (`process.versions.electron` at runtime).

**Packaging consideration:** The compiled `.node` file must be included in the `.vsix`. Add it to `.vscodeignore` whitelist (un-ignore it), not to the standard exclude list. esbuild cannot bundle native `.node` files — they must be included as-is alongside the bundled JS.

**Alternative considered: `sql.js` (WebAssembly SQLite)**
- Pro: No native addon, works in any Node/Electron version without rebuilding
- Con: Loads entire DB into memory (bad for large review histories), no persistent file-based storage without manual serialization, significantly worse performance, more complex API
- Verdict: Do NOT use sql.js for this project. The data model (PR data, reviews, project analyses) will grow over time and needs real file-based SQLite.

**Alternative considered: `node:sqlite` (built-in, Node 22.5+)**
- Node 22.5 added an experimental built-in SQLite module
- VS Code does NOT yet embed Node 22 as of my knowledge cutoff (it embeds Node 18–20)
- Cannot rely on this; flag for future migration when VS Code upgrades Electron
- Confidence: MEDIUM — this will likely be viable by the time VS Code ships Electron with Node 22

**Confidence: HIGH (approach)** — native addon rebuild is the established pattern for SQLite in Electron apps. **MEDIUM (specific versions)** — verify electron-rebuild version against the specific VS Code Electron version at build time.

### Schema management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `drizzle-orm` | `^0.30.x` | ORM + schema | Type-safe SQL for TypeScript. Works with better-sqlite3. Generates migrations as plain SQL files — auditable and version-controllable. Do NOT use Prisma (requires separate query engine binary; incompatible with VS Code extension packaging). |
| `drizzle-kit` | `^0.20.x` | Migration CLI | Run at dev time to generate migrations, not at extension runtime. |

**Confidence: MEDIUM** — Drizzle ORM is the 2024-2025 community favorite for TypeScript + SQLite. Verify current versions at implementation.

**Alternative: Raw better-sqlite3 with manual SQL**
- Simpler, no ORM dependency
- Acceptable for a personal tool with a small, stable schema
- Recommended if the schema stays under ~8 tables and you're comfortable writing raw SQL
- Decision: Start with raw SQL, introduce Drizzle only if schema complexity demands it

---

## Subprocess / CLI Integration

### Recommendation: Node `child_process.spawn` with streaming output

The extension will shell out to `claude` (Anthropic Claude CLI) and `codex` (OpenAI Codex CLI) already installed on the host machine.

| Technology | Purpose | Why |
|------------|---------|-----|
| `child_process.spawn` (Node built-in) | Launch CLI subprocesses | spawn is preferred over exec for long-running processes — streams stdout/stderr instead of buffering. AI review generation can take 30–120 seconds; buffering would prevent progress reporting. |
| Node `readline` module (built-in) | Parse streaming stdout line-by-line | AI CLIs typically output JSON or Markdown incrementally. readline wraps the stdout stream cleanly. |

**Confidence: HIGH** — This is fundamental Node.js. No external library needed.

### Key implementation patterns

**PATH resolution:** The `claude` and `codex` binaries must be on PATH. VS Code's extension host inherits the shell environment on macOS only if VS Code was launched from a shell (`code .`). When launched from the Dock or Finder, PATH may be minimal. Mitigate:
```typescript
import { execSync } from 'child_process';

function resolveCliPath(binary: string): string {
  try {
    // Use 'which' to find binary, inheriting shell config
    return execSync(`/bin/zsh -i -c "which ${binary}"`, { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(`${binary} CLI not found in PATH. Install it and ensure VS Code is launched from a terminal.`);
  }
}
```

**Timeout handling:** Wrap subprocess calls in a timeout. AI generation can hang. Use `AbortController` with Node's `spawn`:
```typescript
const controller = new AbortController();
const proc = spawn(cliPath, args, { signal: controller.signal });
const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min
```

**Progress reporting to webview:** Stream stdout to a `OutputChannel` + post messages to the webview panel for live progress. Do not wait for process exit before showing anything.

**Structured output:** Invoke `claude` with `--output-format json` (if supported) or parse Markdown from stdout. Design the prompts to emit delimited structured blocks that are easy to parse (e.g., `---JSON_START---` delimiters).

**Confidence: HIGH** — subprocess management is stable Node.js. The PATH resolution pattern is a known VS Code extension gotcha.

---

## Webview (UI panel)

### Recommendation: React 18 + Vite (separate build target)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | `^18.x` | Webview UI framework | The upstream vscode-pull-request-github already uses React for its webviews. Keeping React avoids introducing a second framework and reuses any shared component patterns from upstream. |
| `@types/react` + `@types/react-dom` | `^18.x` | React type definitions | — |
| Vite | `^5.x` | Webview build tool | Separate from the extension host build (esbuild). Vite handles the webview's React/CSS/assets bundle. Output goes to `dist/webview/`. The extension loads it via `webview.html`. |
| `@vscode/webview-ui-toolkit` | `^1.x` | VS Code-styled UI components | Microsoft's official React component library that matches VS Code's design system (buttons, badges, progress rings, data grids). Eliminates need to style custom components to match VS Code themes. |
| CSS Modules or plain CSS | — | Styling | VS Code webviews are sandboxed iframes. CSS custom properties (variables) for VS Code theme colors are injected into the webview — use `var(--vscode-editor-background)` etc. instead of hardcoded colors. |

**Confidence: HIGH** — React + `@vscode/webview-ui-toolkit` is the Microsoft-endorsed stack for VS Code webviews as of 2024-2025.

### Webview message protocol

The webview communicates with the extension host via `vscode.postMessage` / `window.addEventListener('message', ...)`. This is the only channel available.

Design a typed message protocol:
```typescript
// Shared types (imported by both extension host and webview build)
type WebviewMessage =
  | { type: 'review-started'; prNumber: number }
  | { type: 'review-chunk'; content: string }
  | { type: 'review-complete'; review: ReviewData }
  | { type: 'error'; message: string };
```

Put shared message types in a `src/shared/` directory compiled into both build targets (esbuild for extension host, Vite for webview).

**What NOT to use in webview:**
- No `fetch()` from the webview to external APIs — VS Code's Content Security Policy blocks it by default. All external calls must go through the extension host, which the webview asks via messages.
- No `localStorage` or `IndexedDB` — not reliable across VS Code sessions for webviews. All persistence goes through the extension host → SQLite.
- No inline scripts without a nonce — VS Code's CSP requires script nonces.

**Confidence: HIGH** — CSP restrictions are documented VS Code API behavior.

---

## MCP Client Integration

### Recommendation: `@modelcontextprotocol/sdk` TypeScript client

The Privanote MCP server will be queried before AI review generation to pull relevant notes/context.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | `^1.x` | MCP client | Official Anthropic SDK for MCP. Provides `Client` class for connecting to MCP servers, listing tools/resources, and calling tools. No need to implement the JSON-RPC wire protocol manually. |

**Confidence: MEDIUM** — The MCP SDK was at v0.x–v1.x as of my knowledge cutoff. The package name and API may have evolved. Verify current version at `npmjs.com/package/@modelcontextprotocol/sdk` before implementation.

### MCP transport options

MCP supports two transports: stdio and HTTP/SSE.

- **stdio transport:** The extension spawns the MCP server as a subprocess (`privanote-mcp-server`) and communicates via stdin/stdout. Best if the Privanote MCP server is a CLI tool you control.
- **HTTP/SSE transport:** Connect to a running Privanote MCP server over HTTP. Best if the server is already running as a daemon or remote service.

For this project, the Privanote MCP server is likely local (personal tool). Use **stdio transport** if the MCP server is a CLI binary; otherwise **HTTP/SSE** if it's a running service you query.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'privanote-mcp-server',
  args: ['--config', configPath],
});

const client = new Client({ name: 'easy-review', version: '1.0.0' }, {
  capabilities: { tools: {}, resources: {} }
});

await client.connect(transport);
const result = await client.callTool({ name: 'get-notes', arguments: { query: prTitle } });
```

**Key pitfall:** MCP connections are stateful. Manage the client lifecycle carefully — connect once per review session, disconnect after. Do not hold open connections across VS Code sessions.

**Confidence: MEDIUM** — MCP SDK API shape is based on training knowledge. The SDK was actively evolving; verify current Client/Transport API against official docs.

---

## HTTP Client (Privanote API)

### Recommendation: Node built-in `fetch` (Node 18+)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `fetch` (Node built-in) | Node 18+ | HTTP calls to Privanote API | Available in Node 18+ without any import. VS Code's embedded Node 18–20 provides it globally. No external HTTP library needed. |

**Confidence: HIGH** — `fetch` is built into Node 18+ and is available in VS Code's Electron-hosted Node.

**Why not `axios`:**
- Adds 50KB+ to the extension bundle for no meaningful benefit over native fetch
- Interceptors are unnecessary complexity for a small number of endpoints
- Fetch with typed wrappers is sufficient

**Why not `got` or `node-fetch`:**
- `node-fetch` v3 is ESM-only; incompatible with the CommonJS extension host
- `got` is ESM-only in recent versions; same problem
- Native fetch eliminates the compatibility concern entirely

### API client pattern

Wrap fetch in a thin typed client, not a full framework:

```typescript
// src/api/privanote.ts
const BASE_URL = 'https://privanote.yourdomain.com/api';

export async function postReview(review: ReviewPayload, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    throw new Error(`Privanote API error: ${res.status} ${await res.text()}`);
  }
}
```

Store the Privanote API token in VS Code's `SecretStorage` API (`context.secrets.store` / `context.secrets.get`) — never in `globalState` or hardcoded. SecretStorage uses the OS keychain (Keychain on macOS, libsecret on Linux, Windows Credential Manager).

**Confidence: HIGH** — `SecretStorage` is the documented VS Code API for sensitive values since VS Code 1.53.

---

## Build & Packaging

### Recommendation: Two-target build (esbuild for extension host, Vite for webview)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `esbuild` | `^0.20.x` | Bundle extension host code | Upstream already uses this. Fast, produces CommonJS output compatible with VS Code extension host. |
| `vite` | `^5.x` | Bundle webview React app | Separate build target. Outputs to `dist/webview/`. Vite handles React JSX, CSS Modules, tree-shaking. |
| `@vscode/vsce` | `^2.x` | Package into `.vsix` | Required for marketplace submission and local install. |
| `npm` workspaces or simple scripts | — | Build orchestration | Keep it simple: two npm scripts (`build:extension`, `build:webview`) called from a root `build` script. Do not introduce Turborepo or nx for a single-extension repo. |

**esbuild config for extension host:**
```javascript
// esbuild.js
require('esbuild').build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  target: 'node20',
  format: 'cjs',        // CommonJS — required for VS Code
  external: [
    'vscode',           // Provided by VS Code at runtime
    'better-sqlite3',   // Native addon — cannot be bundled
  ],
  sourcemap: true,
});
```

**Critical:** `vscode` and `better-sqlite3` (and any other native `.node` modules) must be in `external`. Native addons cannot be bundled by esbuild — they must sit alongside the output JS and be `require()`'d by relative path at runtime.

**Confidence: HIGH** — This two-target pattern is the established approach for VS Code extensions with webviews as of 2024-2025.

### .vscodeignore

The `.vscodeignore` file controls what goes into the `.vsix`. Key rules:
```
# Exclude everything not needed at runtime
src/
node_modules/        # bundled via esbuild, not needed raw
*.ts                 # source maps only if desired

# Un-ignore what IS needed at runtime
!dist/
!dist/extension.js
!dist/webview/
!node_modules/better-sqlite3/   # native addon must ship
!node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

**Confidence: HIGH** — this pattern is required for native addons in VS Code extensions.

---

## What NOT to Use

### Do NOT use webpack
The upstream recently migrated away from webpack to esbuild. Introducing webpack reintroduces build complexity without benefit. The only reason to consider webpack is if you need `node-loader` for `.node` native addons — but the correct solution is to externalize native addons from the bundle, not to bundle them through webpack's loader.

### Do NOT use Prisma ORM
Prisma requires a query engine binary (a separate Rust-compiled process). This binary cannot be packaged inside a VS Code `.vsix` in the same way as a native `.node` file, and it requires spawning a subprocess — adding fragility. Use Drizzle ORM or raw better-sqlite3 SQL instead.

### Do NOT use async SQLite drivers (node-sqlite3, `sqlite` npm package)
VS Code's extension host does not benefit from async I/O for SQLite — SQLite itself is synchronous at the OS level. Async wrappers add complexity without benefit. better-sqlite3's synchronous API is cleaner.

### Do NOT use ESM modules in the extension host
VS Code's extension host requires CommonJS. ESM support is experimental and not production-ready as of VS Code 1.96 (my knowledge cutoff). The upstream fork uses CommonJS; keep it.

### Do NOT use `node-fetch` v3 or `got` v12+
Both are ESM-only in their modern versions, incompatible with the CommonJS extension host. Use native `fetch` instead.

### Do NOT use `axios`
Unnecessary bundle weight. Native fetch is sufficient for the small number of Privanote API endpoints.

### Do NOT use `sql.js` (WASM SQLite)
Loads entire database into memory; not suitable for growing persistent storage. No file-based persistence without manual serialization.

### Do NOT use React in the extension host
React belongs only in the webview (separate Vite bundle). The extension host is pure Node.js. Using React outside the webview sandbox causes unnecessary bundle bloat.

### Do NOT use `vscode-webview-ui-toolkit` (deprecated name)
The package was renamed to `@vscode/webview-ui-toolkit`. Install the scoped version.

---

## Versions Summary Table

| Package | Recommended Version | Confidence | Verify At |
|---------|---------------------|------------|-----------|
| TypeScript | `~5.4.x` | HIGH | `npmjs.com/package/typescript` |
| `@types/node` | `~20.x` | HIGH | Match VS Code's Electron Node version |
| `@types/vscode` | `^1.85.0` | HIGH | Set to match `engines.vscode` |
| `esbuild` | `^0.20.x` | MEDIUM | Upstream fork's `package.json` |
| `vite` | `^5.x` | MEDIUM | `vitejs.dev/blog` |
| React | `^18.x` | HIGH | `react.dev` |
| `@vscode/webview-ui-toolkit` | `^1.x` | MEDIUM | `npmjs.com/package/@vscode/webview-ui-toolkit` |
| `@vscode/vsce` | `^2.x` | HIGH | `npmjs.com/package/@vscode/vsce` |
| `@vscode/test-electron` | `^2.x` | HIGH | `npmjs.com/package/@vscode/test-electron` |
| `better-sqlite3` | `^9.4.x` | MEDIUM | `npmjs.com/package/better-sqlite3` |
| `electron-rebuild` / `@electron/rebuild` | match VS Code Electron | MEDIUM | Check VS Code release notes for Electron version |
| `drizzle-orm` | `^0.30.x` | MEDIUM | `orm.drizzle.team` |
| `@modelcontextprotocol/sdk` | `^1.x` | MEDIUM | `npmjs.com/package/@modelcontextprotocol/sdk` |
| `fetch` (built-in) | Node 18+ built-in | HIGH | No install needed |

---

## Sources

**Note:** All claims are based on training knowledge (cutoff August 2025). No live web access was available during this research session. The following official sources should be consulted to verify all version numbers and API shapes before implementation:

- VS Code Extension API: `https://code.visualstudio.com/api`
- VS Code Webview guide: `https://code.visualstudio.com/api/extension-guides/webview`
- VS Code SecretStorage API: `https://code.visualstudio.com/api/references/vscode-api#SecretStorage`
- better-sqlite3 docs: `https://github.com/WiseLibs/better-sqlite3`
- electron-rebuild: `https://github.com/electron/rebuild`
- MCP TypeScript SDK: `https://github.com/modelcontextprotocol/typescript-sdk`
- `@vscode/webview-ui-toolkit`: `https://github.com/microsoft/vscode-webview-ui-toolkit`
- Drizzle ORM: `https://orm.drizzle.team/docs/get-started-sqlite`
- Upstream fork: `https://github.com/microsoft/vscode-pull-request-github`
- VS Code release notes (Electron version per release): `https://code.visualstudio.com/updates`
