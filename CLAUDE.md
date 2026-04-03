<!-- GSD:project-start source:PROJECT.md -->
## Project

**Easy Review**

Easy Review is a VS Code extension — a full fork of Microsoft's GitHub Pull Requests extension — that adds AI-powered code review generation for PRs in all states (open, closed, merged). It shells out to the `claude` and `codex` CLIs to produce structured reviews and stores all generated content (PR data, reviews, comments, project analysis) in a local SQLite database. Reviews can be posted as GitHub comments or sent as notes to Privanote via API.

**Core Value:** Generate deep, context-aware AI reviews of any GitHub PR (open, closed, or merged) directly inside VS Code, with everything persisted locally and shareable to Privanote.

### Constraints

- **Tech Stack:** TypeScript + VS Code Extension API — required to fork and extend vscode-pull-request-github
- **AI Runtime:** Must have `claude` and `codex` CLI installed on the host machine — extension depends on these being available in PATH
- **Storage:** SQLite via better-sqlite3 or similar — local file, no server dependency
- **GitHub Auth:** Inherit from the forked extension's existing auth mechanism
- **Compatibility:** Must work with VS Code 1.85+ (same baseline as the upstream fork)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Runtime & Language
### Recommendation: TypeScript 5.4+ on Node 20 LTS
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.4.x | Primary language | Required — upstream fork is TypeScript. Structural types, strict null checks, and const enums are used throughout the upstream codebase. |
| Node.js | 20 LTS (Electron-hosted) | Runtime | VS Code embeds its own Electron/Node runtime. Your extension code runs in that context, not system Node. Node 20 is what VS Code 1.85–1.96 embeds. |
| `@types/node` | `~20.x` | Node type definitions | Must match the Electron-embedded Node version, not the system Node version. Mismatching this causes subtle type errors on `child_process`, `fs`, etc. |
### tsconfig baseline
- `"module": "commonjs"` — required for VS Code extension host (ESM support in extensions is experimental as of VS Code 1.96)
- `"target": "ES2022"` — safe for the embedded Node 20
- `"strict": true` — keep this; the upstream uses it
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
### Fork-specific setup
## SQLite in VS Code Extensions
### Recommendation: `better-sqlite3` with electron-rebuild
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `better-sqlite3` | `^9.4.x` | SQLite driver | Synchronous API — critical for VS Code extensions. The extension host is single-threaded; async SQLite drivers (`node-sqlite3`, `sql.js`) add complexity. better-sqlite3's sync API is simpler and safer here. |
| `electron-rebuild` | `^3.x` | Rebuild native addon for Electron | Must rebuild better-sqlite3 against VS Code's Electron version. This is non-negotiable for native addons. |
| `@electron/rebuild` | `^3.x` | Newer name for electron-rebuild | Same package, new scoped name. Use whichever matches Electron version guidance. |
### The native addon problem — full explanation
# After npm install, rebuild for VS Code's Electron version
- Pro: No native addon, works in any Node/Electron version without rebuilding
- Con: Loads entire DB into memory (bad for large review histories), no persistent file-based storage without manual serialization, significantly worse performance, more complex API
- Verdict: Do NOT use sql.js for this project. The data model (PR data, reviews, project analyses) will grow over time and needs real file-based SQLite.
- Node 22.5 added an experimental built-in SQLite module
- VS Code does NOT yet embed Node 22 as of my knowledge cutoff (it embeds Node 18–20)
- Cannot rely on this; flag for future migration when VS Code upgrades Electron
- Confidence: MEDIUM — this will likely be viable by the time VS Code ships Electron with Node 22
### Schema management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `drizzle-orm` | `^0.30.x` | ORM + schema | Type-safe SQL for TypeScript. Works with better-sqlite3. Generates migrations as plain SQL files — auditable and version-controllable. Do NOT use Prisma (requires separate query engine binary; incompatible with VS Code extension packaging). |
| `drizzle-kit` | `^0.20.x` | Migration CLI | Run at dev time to generate migrations, not at extension runtime. |
- Simpler, no ORM dependency
- Acceptable for a personal tool with a small, stable schema
- Recommended if the schema stays under ~8 tables and you're comfortable writing raw SQL
- Decision: Start with raw SQL, introduce Drizzle only if schema complexity demands it
## Subprocess / CLI Integration
### Recommendation: Node `child_process.spawn` with streaming output
| Technology | Purpose | Why |
|------------|---------|-----|
| `child_process.spawn` (Node built-in) | Launch CLI subprocesses | spawn is preferred over exec for long-running processes — streams stdout/stderr instead of buffering. AI review generation can take 30–120 seconds; buffering would prevent progress reporting. |
| Node `readline` module (built-in) | Parse streaming stdout line-by-line | AI CLIs typically output JSON or Markdown incrementally. readline wraps the stdout stream cleanly. |
### Key implementation patterns
## Webview (UI panel)
### Recommendation: React 18 + Vite (separate build target)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | `^18.x` | Webview UI framework | The upstream vscode-pull-request-github already uses React for its webviews. Keeping React avoids introducing a second framework and reuses any shared component patterns from upstream. |
| `@types/react` + `@types/react-dom` | `^18.x` | React type definitions | — |
| Vite | `^5.x` | Webview build tool | Separate from the extension host build (esbuild). Vite handles the webview's React/CSS/assets bundle. Output goes to `dist/webview/`. The extension loads it via `webview.html`. |
| `@vscode/webview-ui-toolkit` | `^1.x` | VS Code-styled UI components | Microsoft's official React component library that matches VS Code's design system (buttons, badges, progress rings, data grids). Eliminates need to style custom components to match VS Code themes. |
| CSS Modules or plain CSS | — | Styling | VS Code webviews are sandboxed iframes. CSS custom properties (variables) for VS Code theme colors are injected into the webview — use `var(--vscode-editor-background)` etc. instead of hardcoded colors. |
### Webview message protocol
- No `fetch()` from the webview to external APIs — VS Code's Content Security Policy blocks it by default. All external calls must go through the extension host, which the webview asks via messages.
- No `localStorage` or `IndexedDB` — not reliable across VS Code sessions for webviews. All persistence goes through the extension host → SQLite.
- No inline scripts without a nonce — VS Code's CSP requires script nonces.
## MCP Client Integration
### Recommendation: `@modelcontextprotocol/sdk` TypeScript client
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | `^1.x` | MCP client | Official Anthropic SDK for MCP. Provides `Client` class for connecting to MCP servers, listing tools/resources, and calling tools. No need to implement the JSON-RPC wire protocol manually. |
### MCP transport options
- **stdio transport:** The extension spawns the MCP server as a subprocess (`privanote-mcp-server`) and communicates via stdin/stdout. Best if the Privanote MCP server is a CLI tool you control.
- **HTTP/SSE transport:** Connect to a running Privanote MCP server over HTTP. Best if the server is already running as a daemon or remote service.
## HTTP Client (Privanote API)
### Recommendation: Node built-in `fetch` (Node 18+)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `fetch` (Node built-in) | Node 18+ | HTTP calls to Privanote API | Available in Node 18+ without any import. VS Code's embedded Node 18–20 provides it globally. No external HTTP library needed. |
- Adds 50KB+ to the extension bundle for no meaningful benefit over native fetch
- Interceptors are unnecessary complexity for a small number of endpoints
- Fetch with typed wrappers is sufficient
- `node-fetch` v3 is ESM-only; incompatible with the CommonJS extension host
- `got` is ESM-only in recent versions; same problem
- Native fetch eliminates the compatibility concern entirely
### API client pattern
## Build & Packaging
### Recommendation: Two-target build (esbuild for extension host, Vite for webview)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `esbuild` | `^0.20.x` | Bundle extension host code | Upstream already uses this. Fast, produces CommonJS output compatible with VS Code extension host. |
| `vite` | `^5.x` | Bundle webview React app | Separate build target. Outputs to `dist/webview/`. Vite handles React JSX, CSS Modules, tree-shaking. |
| `@vscode/vsce` | `^2.x` | Package into `.vsix` | Required for marketplace submission and local install. |
| `npm` workspaces or simple scripts | — | Build orchestration | Keep it simple: two npm scripts (`build:extension`, `build:webview`) called from a root `build` script. Do not introduce Turborepo or nx for a single-extension repo. |
### .vscodeignore
# Exclude everything not needed at runtime
# Un-ignore what IS needed at runtime
## What NOT to Use
### Do NOT use webpack
### Do NOT use Prisma ORM
### Do NOT use async SQLite drivers (node-sqlite3, `sqlite` npm package)
### Do NOT use ESM modules in the extension host
### Do NOT use `node-fetch` v3 or `got` v12+
### Do NOT use `axios`
### Do NOT use `sql.js` (WASM SQLite)
### Do NOT use React in the extension host
### Do NOT use `vscode-webview-ui-toolkit` (deprecated name)
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
## Sources
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
