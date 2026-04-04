# Phase 6: Multi-Agent PR Review Pipeline with Model Selection - Research

**Researched:** 2026-04-04
**Domain:** Multi-agent orchestration, Claude Agent SDK, VS Code extension host CommonJS compatibility, Ollama HTTP API, Mermaid validation
**Confidence:** HIGH (core stack), MEDIUM (ADK integration path), HIGH (pitfalls)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Replace Phase 5 6-section contract with 7-section contract. Sections: PR Summary, Bug & Risk Analysis, Architecture Changes, Test Coverage, Documentation Review, Visual Overview, Business Impact.
- **D-02:** Phase 02.3 webview section rendering pipeline updated for 7 new section names. Old names retired.
- **D-03:** All 7 agents dispatched concurrently at review start.
- **D-04:** Progressive rendering — sections appear as each agent completes. Still-running sections show spinner placeholder.
- **D-05:** Webview state model changes from single streaming buffer to 7-slot section map (`Record<AgentKey, SectionState>` where state is `pending | generating | complete | error`).
- **D-06:** ADK (`claude_agent_sdk` / Anthropic Agent SDK) is the single orchestration framework for all 7 agents. Manages concurrent dispatch, context propagation, per-agent retry, cancellation.
- **D-07:** ADK orchestrates but does NOT call the Anthropic API directly. Dispatches to CLI execution layer — each sub-agent runs Claude CLI subprocess, Codex CLI subprocess, or Ollama HTTP call.
- **D-08:** Each of the 7 review agents is modeled as an ADK sub-agent.
- **D-09:** Research required (answered below).
- **D-10:** `CLIAdapter` + `ReviewRunner` pattern preserved for Claude and Codex. ADK calls into this layer.
- **D-11:** Introduce `OllamaAdapter` for Ollama/gemma4: `POST http://localhost:11434/api/generate`, `stream: true`, ndjson response, extract `response` field per chunk.
- **D-12:** Common `ModelAdapter` interface wraps CLI path and Ollama HTTP path.
- **D-13:** 7 per-agent prompt templates in `src/easy-review/agents/` (one file per agent).
- **D-14:** `## CONTEXT_REQUEST` header block in each template for lazy context loading.
- **D-15:** Agents that don't need extra context omit `## CONTEXT_REQUEST` or set both to `false`.
- **D-16:** Diagram agent: orchestrator extracts Mermaid block, validates with `mermaid.parse()` or equivalent. Up to 2 retries.
- **D-17:** Self-correction retry: re-run Diagram sub-agent with correction prompt including invalid output + error message.
- **D-18:** After 2 failed retries: render raw Mermaid block + error banner.
- **D-19:** Two new settings: `easyReview.defaultModel` and `easyReview.agentModels`.
- **D-20:** `AgentKey` values: `prSummarizer`, `bugRisk`, `architectureChange`, `testCoverage`, `documentation`, `diagram`, `businessImpact`.
- **D-21:** `easyReview.activeModel` deprecated in favor of `easyReview.defaultModel`.

### Claude's Discretion

- Exact ADK primitives (`subagents`, `tools`, `workflows`) — researcher determines the right ADK API after studying D-09 requirements
- Whether ADK's custom model provider supports CLI subprocess execution natively or needs a thin wrapper
- Exact Mermaid validation approach on the extension host side
- Whether agent prompt templates export a class or a plain function
- Error handling granularity when an individual sub-agent fails
- Whether `OllamaAdapter` uses Node built-in `fetch` or a lightweight wrapper
- Exact shape of `ModelRunOpts`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 6 replaces the single-agent `runReview()` call with a 7-agent parallel pipeline. The critical D-09 research question is answered below, but the answer is surprising: **ADK (`@anthropic-ai/claude-agent-sdk`) is the right package name, it IS available on npm, and esbuild can bundle it into the CommonJS extension host — but ADK only orchestrates Claude agents, not Codex or Ollama**. This means D-06 requires a refinement: ADK orchestrates Claude-model agents via the `claude` CLI subprocess; Codex and Ollama agents run in plain `Promise.all` via their respective adapters. ADK is still the primary orchestration primitive for Claude-path agents.

The ESM compatibility concern is real but solved by the existing esbuild config (`format: 'cjs'`, `mainFields: ['module', 'main']`). esbuild bundles ESM packages into CJS output at build time — no runtime `require()` of `.mjs` files occurs. The documented Electron/Cursor issue arises only when the extension is NOT bundled through esbuild, which is not the case here.

For Mermaid validation in the extension host (Node.js), `mermaid` is browser-only. The correct approach is a lightweight regex check on the extracted Mermaid source: verify it starts with a valid diagram type keyword. This is fast, zero-dependency in the extension host, and catches the most common LLM mistakes. The full `mermaid.render()` validation already happens in the webview.

**Primary recommendation:** Use ADK `query()` for Claude-path agents with `permissionMode: 'bypassPermissions'` and `systemPrompt` set to the per-agent instruction. Run all 7 agents with `Promise.all`, using ADK for Claude agents and direct adapter calls for Codex/Ollama agents. Do not attempt to use ADK as a universal multi-model dispatcher.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| Module system | `"module": "commonjs"` in tsconfig — ESM banned in extension host |
| Bundler | esbuild for extension host (`format: 'cjs'`). Do NOT use webpack for new code. |
| SQLite driver | `better-sqlite3` (synchronous). No async drivers. |
| HTTP client | Node built-in `fetch` (Node 18+). No axios, no node-fetch v3, no got. |
| ORM | Raw SQL. No Drizzle unless schema exceeds 8 tables. No Prisma. |
| React | React 16 in webview (`ReactDOM.render`, not `createRoot`). |
| No webpack | Do not reintroduce webpack for new code paths. |
| No ESM in extension host | `require()` and CJS only in `dist/extension.js`. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | `0.2.92` | Claude agent orchestration (Claude-path only) | Official Anthropic SDK; wraps `claude` CLI subprocess; provides `query()` async generator; `AgentDefinition` for sub-agents |
| Node `child_process.spawn` (built-in) | Node 20 | Claude/Codex CLI subprocess execution | Already established in `ReviewRunner.ts`; streaming stdout via `readline`; battle-tested settle/cancel pattern |
| Node built-in `fetch` | Node 18+ | Ollama HTTP API calls | Available globally; no install; CSP not relevant for extension host |
| Node `readline` (built-in) | Node 20 | Parse ndjson streaming from Ollama | Already used in `ReviewRunner.ts` for CLI stdout parsing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `mermaid` | `^11.x` (already installed) | Mermaid diagram rendering in webview | Webview side only. Already in `MermaidDiagram.tsx`. |
| `better-sqlite3` | `^9.4.x` (already installed) | SQLite access for lazy context loading | Existing `SQLiteStore.getProjectAnalysis()` — no new dep needed |
| `vscode.AbortController` / `CancellationToken` | VS Code API | Cancel all 7 agents simultaneously | Use `AbortController` for ADK `query()` `abortController` option; `CancellationToken` for CLI adapter path |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `Promise.all` for Codex/Ollama | ADK subagents | ADK cannot dispatch Codex/Ollama; plain `Promise.all` is correct for non-Claude models |
| Regex Mermaid validation in extension host | `@mermaid-js/parser` | Adding a 7MB parser dep to the extension host just for validation is unjustified; regex check on diagram type keyword is sufficient for self-correction loop |
| Node built-in `fetch` for Ollama | `axios` | CLAUDE.md explicitly prohibits axios |

**Installation (new dep only):**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

**Version verification:**
```bash
npm view @anthropic-ai/claude-agent-sdk version
# Verified: 0.2.92 as of 2026-04-04
```

---

## D-09 Research Answers

### What is the correct npm package?

**`@anthropic-ai/claude-agent-sdk` — verified at npm v0.2.92.**

`claude_agent_sdk` (Python underscore form) — does NOT exist as an npm package. `@anthropic-ai/sdk` — is the low-level Anthropic Client SDK (direct API calls), NOT the agent orchestration layer. The Agent SDK was renamed from "Claude Code SDK" to "Claude Agent SDK" — documentation references `claude_agent_sdk` as the Python package name; TypeScript package is `@anthropic-ai/claude-agent-sdk`.

### Does ADK work in CommonJS Electron Node 20 (VS Code extension host)?

**Yes, via esbuild bundling — with one important caveat.**

`@anthropic-ai/claude-agent-sdk` is published as ESM-only (`.mjs` files). In environments where the package is `require()`'d at runtime (e.g., unpackaged extensions in Cursor WSL with Node 20), it fails with `ERR_REQUIRE_ESM`. However, the project's `esbuild.extension.js` already handles this:

```js
esbuild.build({
  format: 'cjs',           // Output is CommonJS
  mainFields: ['module', 'main'],  // Prefers ESM source for bundling
  // ...
});
```

esbuild resolves the ESM source at build time and transpiles it into the CJS bundle. The output `dist/extension.js` is pure CJS with no runtime ESM imports. This is the standard solution used in production Electron/VS Code extensions.

**Important**: The SDK must be bundled (not externalized) in `esbuild.extension.js`. It must NOT appear in the `external` array alongside `vscode` and `better-sqlite3`.

**asar unpack**: For `.vsix` packaging, `better-sqlite3` is already handled. ADK does not need asar unpacking because it's bundled into `dist/extension.js` by esbuild — no separate native binary.

### Does ADK support a custom model provider for CLI subprocess execution?

**Partial yes — for Claude only.**

ADK's `query()` function wraps the `claude` CLI subprocess internally. The `spawnClaudeCodeProcess` option allows customizing how the claude subprocess is spawned:

```typescript
type SpawnOptions = {
  command: string;
  args: string[];
  cwd?: string;
  env: Record<string, string | undefined>;
  signal: AbortSignal;
};

interface SpawnedProcess {
  stdin: Writable;
  stdout: Readable;
  readonly killed: boolean;
  readonly exitCode: number | null;
  kill(signal: NodeJS.Signals): boolean;
  on(event: 'exit', listener: ...): void;
  on(event: 'error', listener: ...): void;
  // ...
}
```

`ChildProcess` from `child_process.spawn` already satisfies `SpawnedProcess`. This means the existing `CLIAdapter`/`ReviewRunner` subprocess pattern is compatible with ADK's spawn interface. You can pass `spawnClaudeCodeProcess` to control the spawn (e.g., to set `cwd`, env, or resolve the path via `config.get('claudePath')`).

**ADK does NOT support Codex or Ollama as model providers.** It exclusively spawns the `claude` CLI. Codex and Ollama agents must be run outside ADK using the existing `CLIAdapter` + `ReviewRunner` pattern and `OllamaAdapter` respectively, dispatched via `Promise.all`.

### What ADK primitives best model the 7-agent fan-out?

**Direct `Promise.all` over 7 independent `query()` calls — NOT ADK sub-agents.**

ADK's `agents` / `AgentDefinition` pattern is designed for a *parent agent* that delegates subtasks via the `Agent` tool (the parent Claude instance decides when to invoke sub-agents). This is an LLM-driven orchestration model — the parent agent reasons about when to call each sub-agent. This does NOT match the Phase 6 requirement of programmatic concurrent fan-out of all 7 agents at the same time.

The correct pattern is:

```typescript
// Programmatic concurrent dispatch — no LLM orchestrator layer
const [summary, bugRisk, arch, test, docs, diagram, business] = await Promise.all([
  runAgentQuery('prSummarizer', prompt, model, config),
  runAgentQuery('bugRisk', prompt, model, config),
  // ...
]);
```

For Claude-path agents, `runAgentQuery` calls ADK `query()`. For Codex/Ollama agents, it calls the existing `runReview()` / `OllamaAdapter`. The ADK provides value for Claude-path agents through: `abortController` for cancellation, `pathToClaudeCodeExecutable` for CLI path resolution, `systemPrompt` for per-agent instructions, `maxTurns: 1` to constrain the agent to a single pass.

---

## Architecture Patterns

### Recommended Project Structure

```
src/easy-review/
├── agents/                    # New: per-agent prompt templates
│   ├── AgentOrchestrator.ts   # New: runs all 7 agents with Promise.all
│   ├── BugRiskAgent.ts
│   ├── ArchitectureChangeAgent.ts
│   ├── BusinessImpactAgent.ts
│   ├── DiagramAgent.ts
│   ├── DocumentationAgent.ts
│   ├── PRSummarizerAgent.ts
│   └── TestCoverageAgent.ts
├── cli/
│   ├── ClaudeAdapter.ts       # Unchanged
│   ├── CodexAdapter.ts        # Unchanged
│   ├── OllamaAdapter.ts       # New: HTTP POST to localhost:11434
│   ├── ModelAdapter.ts        # New: common ModelAdapter interface
│   ├── ReviewRunner.ts        # Unchanged (used for Codex path)
│   └── ReviewParser.ts        # Updated: 7-section contract
├── panel/
│   └── ReviewPanel.ts         # Updated: replace executeReview with AgentOrchestrator
└── ...
src/shared/
└── types.ts                   # Updated: AgentKey, SectionState, new message types
src/webview/
├── AgentStatusBar.tsx          # New
├── AgentSlot.tsx              # New
├── SectionPendingPlaceholder.tsx  # New
├── DiagramErrorBanner.tsx     # New
└── ReviewDocument.tsx         # Updated: 7-slot progressive layout
```

### Pattern 1: ADK query() for Claude-path agents

Each Claude-path agent calls `query()` with no tools (plain text generation), `maxTurns: 1`, and its own system prompt:

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function runClaudeAgent(
  promptText: string,
  systemPromptText: string,
  claudePath: string,
  abortController: AbortController,
): Promise<string> {
  let result = '';
  for await (const message of query({
    prompt: promptText,
    options: {
      systemPrompt: systemPromptText,
      maxTurns: 1,
      allowedTools: [],                  // No tool use — pure text generation
      permissionMode: 'bypassPermissions',
      pathToClaudeCodeExecutable: claudePath,
      abortController,
    },
  })) {
    if ('result' in message) {
      result = message.result ?? '';
    }
  }
  return result;
}
```

### Pattern 2: OllamaAdapter via Node built-in fetch

```typescript
// Source: https://github.com/ollama/ollama/blob/main/docs/api.md
export async function runOllamaAgent(
  prompt: string,
  model: string,          // e.g. 'gemma4'
  signal: AbortSignal,
  onChunk: (text: string) => void,
): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: true }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`);
  }
  let fullOutput = '';
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let leftover = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) { break; }
    const chunk = leftover + decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    leftover = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) { continue; }
      const event = JSON.parse(line);
      if (typeof event.response === 'string') {
        fullOutput += event.response;
        onChunk(event.response);
      }
    }
  }
  return fullOutput;
}
```

### Pattern 3: CONTEXT_REQUEST header parsing

```typescript
// Parse ## CONTEXT_REQUEST header from prompt template
function parseContextRequest(template: string): {
  projectAnalysis: boolean;
  commitHistory: boolean;
  body: string;
} {
  const headerMatch = template.match(
    /^##\s+CONTEXT_REQUEST\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  );
  if (!headerMatch) {
    return { projectAnalysis: false, commitHistory: false, body: template };
  }
  const headerBlock = headerMatch[1];
  const body = headerMatch[2];
  const projectAnalysis = /project_analysis:\s*true/i.test(headerBlock);
  const commitHistory = /commit_history:\s*true/i.test(headerBlock);
  return { projectAnalysis, commitHistory, body };
}
```

### Pattern 4: Mermaid validation in extension host (Node.js)

`mermaid` is browser-only (DOM required). In the extension host, validate Mermaid by checking that the extracted source starts with a recognized diagram type keyword:

```typescript
const MERMAID_DIAGRAM_TYPES = [
  'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
  'stateDiagram-v2', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph',
  'mindmap', 'timeline', 'xychart-beta', 'block-beta', 'quadrantChart',
];

export function validateMermaidSyntax(source: string): { valid: boolean; error?: string } {
  const firstLine = source.trim().split('\n')[0].trim();
  const isRecognizedType = MERMAID_DIAGRAM_TYPES.some(
    (type) => firstLine.toLowerCase().startsWith(type.toLowerCase())
  );
  if (!isRecognizedType) {
    return {
      valid: false,
      error: `Unrecognized diagram type: "${firstLine}". Expected one of: ${MERMAID_DIAGRAM_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

// Extract mermaid source from markdown
export function extractMermaidBlock(content: string): string | null {
  const match = content.match(/```mermaid\s*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
```

This is the correct approach for the extension host validation loop (D-16 through D-18). The full rendering validation happens in the webview's existing `mermaid.render()` call in `MermaidDiagram.tsx`.

### Pattern 5: 7-slot section state model

```typescript
// Add to src/shared/types.ts
export type AgentKey =
  | 'prSummarizer'
  | 'bugRisk'
  | 'architectureChange'
  | 'testCoverage'
  | 'documentation'
  | 'diagram'
  | 'businessImpact';

export type SectionStatus = 'pending' | 'generating' | 'complete' | 'error';

export interface SectionState {
  status: SectionStatus;
  content?: string;     // populated when status === 'complete'
  error?: string;       // populated when status === 'error'
}

// New ExtensionMessage type
// | { type: 'sectionUpdate'; agentKey: AgentKey; state: SectionState }
```

### Anti-Patterns to Avoid

- **Using ADK sub-agents (agents option) for 7-agent fan-out**: ADK's `agents` option creates an LLM-driven parent that decides when to call sub-agents. For programmatic concurrent fan-out, use `Promise.all` over 7 independent `query()` calls.
- **Externalizing `@anthropic-ai/claude-agent-sdk` in esbuild**: The SDK must be bundled (not added to the `external` array). Externalizing an ESM-only package causes `ERR_REQUIRE_ESM` at runtime in VS Code's Node 20 extension host.
- **Calling `mermaid.parse()` in the extension host**: mermaid requires a DOM. Use regex-based diagram type validation in the extension host; let the webview's `mermaid.render()` perform full rendering validation.
- **Using ADK for Codex or Ollama agents**: ADK only spawns the `claude` CLI. Codex and Ollama must use their own adapters dispatched via `Promise.all`.
- **Streaming chunks to single buffer during 7-agent run**: Replace the single `streamChunk` buffer with per-agent `sectionUpdate` messages. The old single-buffer pattern conflicts with concurrent agent state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude agent orchestration | Custom JSON-RPC or MCP client | ADK `query()` | ADK handles the claude CLI subprocess protocol, streaming, cancellation, session management |
| Concurrent async fan-out | Custom worker pool | `Promise.all` | Node's event loop handles concurrent async operations natively; no threads needed |
| Streaming ndjson from Ollama | Custom line splitter | `readline` (built-in) or `ReadableStream` reader with `\n` split | Standard Node pattern; already used in `ReviewRunner.ts` |
| AbortController wiring | Custom kill() tracking | `AbortController` passed to ADK `abortController` option + `signal` to fetch | Single abort signal cancels all 7 agents |

**Key insight:** The hardest problem in this phase is coordinating 7 concurrent async generators that each post updates to the webview. The solution is NOT a complex state machine — it's `Promise.all` + a simple `onSectionUpdate` callback that maps to `postMessage({ type: 'sectionUpdate', agentKey, state })`.

---

## Common Pitfalls

### Pitfall 1: ERR_REQUIRE_ESM if claude-agent-sdk is externalized
**What goes wrong:** If `@anthropic-ai/claude-agent-sdk` is added to esbuild's `external` array (alongside `vscode` and `better-sqlite3`), VS Code's Node 20 extension host will try to `require()` the ESM-only `.mjs` entry point at runtime and throw `ERR_REQUIRE_ESM`.
**Why it happens:** `external` tells esbuild to skip bundling and leave the `require()` call in the output. Node 20 cannot `require()` ESM modules without the experimental `--experimental-require-module` flag.
**How to avoid:** Do NOT add `@anthropic-ai/claude-agent-sdk` to the `external` array in `esbuild.extension.js`. Let esbuild bundle it.
**Warning signs:** Extension activation fails with `ERR_REQUIRE_ESM: require() of ES Module ... sdk.mjs not supported`.

### Pitfall 2: ADK spawns its own bundled claude CLI by default
**What goes wrong:** ADK bundles `cli.js` internally as its default Claude Code executable. In a packaged `.vsix`, the bundled `cli.js` may not be at the expected path, causing a spawn error.
**Why it happens:** ADK's default `pathToClaudeCodeExecutable` points to a file inside `node_modules/@anthropic-ai/claude-agent-sdk/`, which esbuild does NOT bundle (only TypeScript source is bundled).
**How to avoid:** Always pass `pathToClaudeCodeExecutable` explicitly from the VS Code settings (`config.get('claudePath')` or resolved PATH). Never rely on ADK's default executable path.
**Warning signs:** `Error: spawn ENOENT` when ADK tries to find `cli.js` in a non-existent location after bundling.

### Pitfall 3: 7 concurrent agents post to disposed webview panel
**What goes wrong:** If the user closes the ReviewPanel while agents are running, `postMessage()` throws on a disposed panel. With 7 concurrent async generators, multiple agents can throw simultaneously.
**Why it happens:** `ReviewPanel.postMessage()` already guards against this with a try/catch, but the 7-slot state updates must also route through the same guard.
**How to avoid:** Route all `sectionUpdate` messages through the existing `ReviewPanel.postMessage()` guard. Abort all 7 agents on panel dispose (using `AbortController.abort()`).
**Warning signs:** Unhandled promise rejections from disposed webview panel during agent completion.

### Pitfall 4: `Promise.all` rejects immediately on first agent failure
**What goes wrong:** Using bare `Promise.all` means if one agent errors, all remaining agents still run but their results are silently discarded because `Promise.all` rejects on the first error.
**Why it happens:** `Promise.all` fast-fails on first rejection.
**How to avoid:** Use `Promise.allSettled` instead of `Promise.all` so each agent's result/error is captured independently. Map each settled result to the corresponding `SectionState`.
**Warning signs:** Some sections show error state while others are permanently stuck in `pending` despite having completed — their results were discarded.

### Pitfall 5: OllamaAdapter fails silently when Ollama is not running
**What goes wrong:** `fetch('http://localhost:11434/api/generate')` throws `ECONNREFUSED` when Ollama is not running. If this error is swallowed, the section stays in `pending` forever.
**Why it happens:** Ollama is not a managed dependency — it must be running independently on the host machine.
**How to avoid:** Catch `ECONNREFUSED` explicitly in `OllamaAdapter` and throw a user-readable error: "Ollama is not running. Start Ollama and retry." Surface this as a `SectionState` with `status: 'error'` and a helpful message.
**Warning signs:** Visual Overview or other Ollama-assigned sections permanently stuck in `pending` with no error message.

### Pitfall 6: Mermaid validation loop retries indefinitely
**What goes wrong:** The retry logic for Diagram agent (D-17) must stop after exactly 2 retries, not loop until success.
**Why it happens:** Off-by-one in retry counter — treating retry 0 and retry 1 as both "first retry" or checking `retries < 2` vs `retries <= 2`.
**How to avoid:** Initialize `let diagramRetries = 0;` and check `while (diagramRetries < 2)` before retrying. After the loop, if still invalid, render raw + error banner (D-18).
**Warning signs:** Visual Overview section stays `generating` indefinitely; no timeout.

### Pitfall 7: ADK `maxTurns` not set — agent uses multiple turns
**What goes wrong:** By default, ADK `query()` allows many tool-use turns. A review agent with no tools but without `maxTurns: 1` may still run extra turns via agent reasoning, slowing down generation.
**Why it happens:** ADK defaults are designed for agentic code tasks (many turns). PR review generation is a single-pass text synthesis task.
**How to avoid:** Always set `maxTurns: 1` for all 7 review agents. They should produce their section in a single pass.
**Warning signs:** Agent takes 2-5x longer than expected; multiple message events before `result`.

---

## Code Examples

### ADK query() for a review agent (Claude path)

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { AbortController } from 'node:events';

export async function runClaudeReviewAgent(opts: {
  agentKey: string;
  promptData: string;       // PR diff + metadata
  systemInstruction: string; // Per-agent synthesis instruction
  claudePath: string;
  abortController: AbortController;
  onChunk?: (text: string) => void;
}): Promise<string> {
  let fullResult = '';
  for await (const message of query({
    prompt: opts.promptData,
    options: {
      systemPrompt: opts.systemInstruction,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      pathToClaudeCodeExecutable: opts.claudePath,
      abortController: opts.abortController,
      persistSession: false,           // Don't persist single-use review sessions
    },
  })) {
    // Stream partial text via onChunk if desired
    if ('result' in message && typeof message.result === 'string') {
      fullResult = message.result;
    }
  }
  return fullResult;
}
```

### OllamaAdapter streaming pattern

```typescript
// Source: https://github.com/ollama/ollama/blob/main/docs/api.md
export class OllamaAdapter {
  async run(opts: {
    prompt: string;
    model: string;
    signal: AbortSignal;
    onChunk: (text: string) => void;
  }): Promise<string> {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: opts.model, prompt: opts.prompt, stream: true }),
      signal: opts.signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Ollama error HTTP ${res.status}`);
    }
    let fullOutput = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let carry = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) { break; }
      carry += decoder.decode(value, { stream: true });
      const lines = carry.split('\n');
      carry = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) { continue; }
        try {
          const evt = JSON.parse(line);
          if (typeof evt.response === 'string') {
            fullOutput += evt.response;
            opts.onChunk(evt.response);
          }
        } catch {
          // malformed ndjson line — skip
        }
      }
    }
    return fullOutput;
  }
}
```

### Promise.allSettled fan-out pattern

```typescript
// Dispatch all 7 agents concurrently; capture each result independently
const AGENT_KEYS: AgentKey[] = [
  'prSummarizer', 'bugRisk', 'architectureChange',
  'testCoverage', 'documentation', 'diagram', 'businessImpact',
];

const results = await Promise.allSettled(
  AGENT_KEYS.map((agentKey) =>
    runAgent(agentKey, context, config, abort, (text) => {
      onSectionUpdate(agentKey, { status: 'generating', content: text });
    })
  )
);

for (let i = 0; i < AGENT_KEYS.length; i++) {
  const key = AGENT_KEYS[i];
  const result = results[i];
  if (result.status === 'fulfilled') {
    onSectionUpdate(key, { status: 'complete', content: result.value });
  } else {
    onSectionUpdate(key, {
      status: 'error',
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `claude_code_sdk` (old name) | `@anthropic-ai/claude-agent-sdk` | 2025 (rename) | Import path changed; docs reference both names |
| Single `runReview()` blocking call | 7-agent `Promise.allSettled` fan-out | Phase 6 | Progressive display; faster time-to-first-section |
| Single `streamChunk` message type | Per-section `sectionUpdate` messages | Phase 6 | Webview can render sections independently as they complete |
| Global `activeModel` setting | Per-agent `agentModels` + `defaultModel` | Phase 6 | Different agents can use different models |

**Deprecated/outdated:**
- `easyReview.activeModel` setting: replaced by `easyReview.defaultModel`. Phase 6 reads `activeModel` as fallback if `defaultModel` is unset (D-21).
- 6-section review contract (`Executive Summary`, `Categorized Changes`, etc.): retired. 7 new section names take effect.
- `StreamingView` component: repurposed or retired. `AgentStatusBar` + per-section spinners replace streaming display.

---

## Open Questions

1. **Can ADK `query()` be cancelled mid-run when the Diagram agent needs a retry?**
   - What we know: ADK's `query()` accepts `abortController`. Calling `abort()` terminates the current run.
   - What's unclear: Whether aborting one `query()` call and immediately starting a new one (for retry) works reliably, or whether there is a delay/process teardown period between calls.
   - Recommendation: Implement retry as: abort current AbortController → create new AbortController → call `query()` again. If retry is unreliable, fall back to simply re-running the Diagram agent with a new `query()` call using a fresh prompt.

2. **How does ADK handle the claude CLI path when esbuild bundles the SDK?**
   - What we know: ADK defaults to its internal `cli.js` path. This path is inside the npm package, which esbuild bundles into `dist/extension.js`. The internal `cli.js` binary is NOT bundled — only TypeScript source is bundled.
   - What's unclear: Whether ADK's internal path resolution falls back gracefully to PATH lookup, or whether it hardcodes a relative path to `cli.js`.
   - Recommendation: Always pass `pathToClaudeCodeExecutable` explicitly (`config.get('claudePath')` or `'claude'` as bare command). Never rely on ADK's default. Verified: `pathToClaudeCodeExecutable` supports bare command names (npm v0.2.63 changelog confirmed).

3. **Does `Promise.allSettled` over 7 ADK `query()` calls work if all 7 call the same claude CLI binary concurrently?**
   - What we know: Each `query()` spawns a separate `claude` subprocess. The claude CLI has its own internal API call management.
   - What's unclear: Whether 7 concurrent claude subprocesses cause rate limiting, resource contention, or session conflicts.
   - Recommendation: Document this as a known risk. If rate limiting occurs, add a configurable concurrency limit (e.g., run 3-4 at a time). For initial implementation, test with all 7 concurrent.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `claude` CLI | Claude-path agents (ADK) | Unknown (user-configured) | Varies | Clear error: "Claude CLI not found. Configure easyReview.claudePath." |
| `codex` CLI | Codex-path agents | Unknown (user-configured) | Varies | Clear error: "Codex CLI not found. Configure easyReview.codexPath." |
| Ollama HTTP (localhost:11434) | Ollama-path agents | Not installed on dev machine (verified: `ollama` not in PATH) | — | `SectionState` with `status: 'error'`, message: "Ollama is not running. Start Ollama to use gemma4 model." |
| Node built-in `fetch` | OllamaAdapter | Built-in (Node 18+) | Node 18+ | — |
| `better-sqlite3` | Lazy context loading | Already installed and working | `^9.4.x` | — |

**Missing dependencies with no fallback:**
- None. All missing runtime dependencies (claude, codex, Ollama) have clear user-facing error paths already established in the codebase.

**Missing dependencies with fallback:**
- Ollama: not installed on dev machine. OllamaAdapter must handle `ECONNREFUSED` with a user-readable error. Agents configured to use `ollama` will show `error` status in their section slot.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (already configured) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit -- --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-03 | All 7 agents dispatched concurrently | unit | `npm run test:unit -- --reporter=verbose` | ❌ Wave 0 |
| D-04 | Progressive rendering: sections appear as agents complete | unit (postMessage mock) | `npm run test:unit` | ❌ Wave 0 |
| D-05 | 7-slot `Record<AgentKey, SectionState>` state map | unit | `npm run test:unit` | ❌ Wave 0 |
| D-11 | OllamaAdapter streams ndjson correctly | unit (fetch mock) | `npm run test:unit` | ❌ Wave 0 |
| D-14 | CONTEXT_REQUEST header parser | unit | `npm run test:unit` | ❌ Wave 0 |
| D-16 | Mermaid validation in extension host | unit | `npm run test:unit` | ❌ Wave 0 |
| D-17 | Diagram retry (max 2 retries) | unit | `npm run test:unit` | ❌ Wave 0 |
| D-19 | Settings migration: activeModel → defaultModel | unit | `npm run test:unit` | ❌ Wave 0 |
| D-01 | ReviewParser handles 7 new section names | unit | `npm run test:unit` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit -- --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/easy-review/agents/AgentOrchestrator.test.ts` — covers D-03, D-04, D-05
- [ ] `src/easy-review/cli/OllamaAdapter.test.ts` — covers D-11
- [ ] `src/easy-review/agents/contextRequest.test.ts` — covers D-14
- [ ] `src/easy-review/agents/mermaidValidation.test.ts` — covers D-16, D-17
- [ ] `src/easy-review/cli/ReviewParser.test.ts` (update) — covers D-01 (7 section names)

---

## Sources

### Primary (HIGH confidence)
- `https://platform.claude.com/docs/en/agent-sdk/overview` — ADK overview, package name, TypeScript API
- `https://platform.claude.com/docs/en/agent-sdk/typescript` — Full TypeScript API reference (`query()`, `Options`, `SpawnedProcess`, `SpawnOptions`, `AgentDefinition`)
- `https://github.com/ollama/ollama/blob/main/docs/api.md` — Ollama `/api/generate` endpoint, streaming ndjson format
- npm registry (`npm view @anthropic-ai/claude-agent-sdk`) — version 0.2.92, deps: `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`
- `esbuild.extension.js` in project — confirms `format: 'cjs'`, `mainFields: ['module', 'main']`

### Secondary (MEDIUM confidence)
- `https://liruifengv.com/posts/claude-agent-sdk-pitfalls-en/` — Electron packaging pitfalls (cli.js path, node spawn, asar unpack); verified ESM bundling workaround
- `https://github.com/highagency/pencil-desktop-releases/issues/13` — Confirmed `ERR_REQUIRE_ESM` pattern in VS Code extension host; esbuild transform solution verified
- `https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md` — v0.2.63 `pathToClaudeCodeExecutable` bare command support confirmed

### Tertiary (LOW confidence)
- WebSearch results about concurrent claude subprocess limits — no official documentation found; open question flagged above.

---

## Metadata

**Confidence breakdown:**
- Standard Stack (ADK): HIGH — npm registry confirmed, official docs verified
- Standard Stack (Ollama): HIGH — official API docs confirmed
- Architecture (ADK integration): MEDIUM — confirmed via docs + community issues, but runtime behavior with 7 concurrent instances not empirically tested
- Pitfalls: HIGH — ESM/CJS pitfall confirmed via real bug reports; others derived from existing codebase patterns

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (ADK is actively developed; verify version before implementation)
