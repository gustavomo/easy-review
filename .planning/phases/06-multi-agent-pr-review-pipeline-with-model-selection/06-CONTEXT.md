# Phase 6: Multi-agent PR Review Pipeline with Model Selection - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the single `runReview()` call in `ReviewPanel.ts` with a 7-agent parallel orchestrator. Each agent runs concurrently, owns one review section, and receives only the PR diff + file list by default. Project context and commit history are loaded lazily based on a `## CONTEXT_REQUEST` header in each agent's prompt template. The Diagram agent's Mermaid output is validated by the orchestrator with up to 2 self-correction retries. A new `ModelAdapter` abstraction supports Claude (CLI), Codex (CLI), and Ollama/gemma4 (HTTP), with per-agent model selection via VS Code settings.

Out of scope: Privanote integration, GitHub comment posting, new GitHub data fetches beyond what Phase 5 established.

</domain>

<decisions>
## Implementation Decisions

### Output Section Contract

- **D-01:** Replace the Phase 5 6-section contract with a new 7-section contract. Each agent owns exactly one section. Section names (in display order): PR Summary, Bug & Risk Analysis, Architecture Changes, Test Coverage, Documentation Review, Visual Overview, Business Impact.
- **D-02:** The webview section rendering pipeline must handle the new section names. Phase 02.3 components (`ReviewDocument`, per-section renderers) are updated to match the 7-section contract. Old section names (Executive Summary, Categorized Changes, etc.) are retired.

### Parallel Execution & Progressive Display

- **D-03:** All 7 agents are dispatched concurrently at review start. Each agent runs as an independent async operation.
- **D-04:** Progressive rendering — sections appear in the webview as each agent completes. Still-running sections show a spinner placeholder. The user can read finished sections while others are still generating. No wait for all 7.
- **D-05:** The webview state model changes from a single streaming buffer to a 7-slot section map (`Record<AgentKey, SectionState>`), where `SectionState` is `pending | generating | complete | error`.

### ModelAdapter Interface

- **D-06:** Introduce a new `ModelAdapter` interface that replaces `CLIAdapter` as the common abstraction for all AI backends:
  ```ts
  interface ModelAdapter {
    run(prompt: string, opts: ModelRunOpts): Promise<string>;
    // hides CLI subprocess vs HTTP difference
  }
  ```
  `ClaudeAdapter` and `CodexAdapter` are refactored to implement `ModelAdapter` (backward compatible — streaming via `onChunk` callback in `ModelRunOpts`).
- **D-07:** `OllamaAdapter` implements `ModelAdapter` via HTTP POST to `http://localhost:11434/api/generate` with `stream: true`. Response is newline-delimited JSON; extract `response` field from each chunk.
- **D-08:** The existing `runReview()` function in `ReviewRunner.ts` is replaced by an agent runner that accepts a `ModelAdapter` instance (not a `cliPath` + `CLIAdapter` pair).

### Per-Agent Prompt Templates & Lazy Context Loading

- **D-09:** Each of the 7 agents has its own prompt template. Templates live in a new `src/easy-review/agents/` directory, one file per agent (e.g., `BugRiskAgent.ts`, `DiagramAgent.ts`).
- **D-10:** Each agent prompt template starts with a `## CONTEXT_REQUEST` header block:
  ```
  ## CONTEXT_REQUEST
  project_analysis: true
  commit_history: false
  ---
  ```
  The orchestrator parses this header, fetches the declared context (project analysis from SQLite, commit history from GitHub), strips the header, and injects the context into the prompt before dispatching to the model.
- **D-11:** Agents that don't need extra context simply omit the `## CONTEXT_REQUEST` block or set both to `false`.

### Diagram Agent Self-Correction

- **D-12:** After the Diagram agent completes, the orchestrator extracts the Mermaid code block from the output and validates it using the `mermaid.parse()` API (already available in the extension host via the webview bundle — or use a lightweight parse check server-side).
- **D-13:** On validation failure: re-run the Diagram agent with a correction prompt that includes the invalid output and the parse error message. Retry up to 2 times.
- **D-14:** After 2 failed retries, render the Visual Overview section with the raw Mermaid code block plus an error banner: "⚠️ Diagram failed to render — raw output shown below."

### VS Code Settings for Model Selection

- **D-15:** Two settings:
  - `easyReview.defaultModel: "claude" | "codex" | "ollama"` — used for any agent not explicitly overridden
  - `easyReview.agentModels: Record<AgentKey, "claude" | "codex" | "ollama">` — per-agent overrides; unspecified agents inherit `defaultModel`
- **D-16:** `AgentKey` values: `prSummarizer`, `bugRisk`, `architectureChange`, `testCoverage`, `documentation`, `diagram`, `businessImpact`.
- **D-17:** The `easyReview.activeModel` setting from Phase 2 (D-05 in 02-CONTEXT.md) is deprecated in favor of `easyReview.defaultModel`. Migration: existing `activeModel` value is read as `defaultModel` if `defaultModel` is unset.

### Claude's Discretion

- Exact Mermaid validation approach on the extension host side (inline parse function vs lightweight dependency)
- Whether agent prompt templates export a class or a plain function
- Error handling granularity when an individual agent fails (show error in that section's slot vs abort the entire review)
- Whether `OllamaAdapter` uses Node built-in `fetch` or a lightweight wrapper
- Exact shape of `ModelRunOpts` (streaming callback, cancellation token, timeout)

</decisions>

<specifics>
## Specific Ideas

- The user specified that the Diagram agent should validate its own output before declaring the result final — implemented as orchestrator-side validation with up to 2 self-correction retries (D-12 through D-14).
- "Show raw + error banner" is the fallback on persistent Mermaid failure — do not silently omit the section.
- Per-agent model assignment should be ergonomic: default covers most agents, object overrides only what differs (e.g., route the Diagram agent to Claude for quality, everything else to Codex for speed).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core files being replaced / heavily modified
- `src/easy-review/cli/ReviewRunner.ts` — Current single-agent runner; Phase 6 refactors this into a multi-agent orchestrator. Read to understand the existing streaming/cancellation/settle pattern.
- `src/easy-review/cli/ClaudeAdapter.ts` — `CLIAdapter` interface definition (line 17–20) + `ClaudeAdapter`; Phase 6 introduces `ModelAdapter` as a superset. Read for the interface shape before defining `ModelAdapter`.
- `src/easy-review/cli/CodexAdapter.ts` — Read alongside `ClaudeAdapter.ts`; both are refactored to implement `ModelAdapter`.
- `src/easy-review/cli/PromptBuilder.ts` — Current single 240-line prompt; Phase 6 splits into 7 per-agent prompt templates. Read to understand the `BuildPromptOptions` interface and SYNTHESIS_INSTRUCTION structure before authoring per-agent prompts.
- `src/easy-review/panel/ReviewPanel.ts` — Current orchestrator (singleton, calls `runReview` once); Phase 6 refactors the review generation path heavily. Read to understand the webview state machine and postMessage protocol before redesigning.
- `src/easy-review/cli/ReviewParser.ts` — Section heading matching logic; updated for 7 new section names. Read `buildSection()` and `parseFindingsSection()`.

### Phase context that carries forward
- `.planning/phases/05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis/05-CONTEXT.md` — SYNTHESIS_INSTRUCTION content, data enrichment decisions (D-01 through D-12). Per-agent prompts in Phase 6 inherit the quality bar and annotation rules from Phase 5's prompt; they don't start from scratch.
- `.planning/phases/02-ai-review-generation/02-CONTEXT.md` — D-05 (`easyReview.activeModel` setting), D-12 through D-18 (streaming/progress display patterns), D-19 through D-27 (webview panel lifecycle). These carry forward unless explicitly superseded by Phase 6 decisions above.
- `.planning/phases/02.3-review-panel-rich-rendering/02.3-CONTEXT.md` — `ReviewDocument` component structure, section renderer components, Mermaid rendering pipeline. Phase 6 updates section names and adds the 7-slot progressive state model.

### Webview state and rendering
- `src/easy-review/panel/ReviewPanel.ts` — Webview postMessage protocol (see `ExtensionMessage` / `WebviewMessage` types in `src/shared/types.ts`); Phase 6 adds new message types for per-section updates.
- `src/shared/types.ts` — `ReviewSection`, `ParsedReview`, `WebviewState` types; Phase 6 updates these for the 7-section contract and progressive state model.

### Ollama HTTP API
- No external docs needed — Ollama's generate endpoint is `POST http://localhost:11434/api/generate` with `{ model, prompt, stream: true }`. Response is ndjson with `{ response, done }` fields per chunk. Planner should verify against current Ollama docs at implementation time.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReviewRunner.runReview(cliPath, adapter, opts)` — the streaming/settle/cancellation pattern (200ms batch interval, `settled` flag, `SIGTERM` on cancel) is battle-tested. Preserve this pattern inside the new per-agent runner; don't redesign the subprocess lifecycle.
- `DiffFetcher.fetchPRDiff`, `fetchPRCommits`, `fetchReviewComments` — the lazy context loading (D-10) builds on these existing fetchers. The orchestrator calls them conditionally based on the `## CONTEXT_REQUEST` header.
- `SQLiteStore.getProjectAnalysis()` (or equivalent) — already stores project analysis as a single row; lazy loading in D-10 just calls this conditionally.
- Phase 02.3 webview section components (`FindingsSection`, `MermaidSection`, etc.) — some can be repurposed with new names; others need new variants for the 7 new section types.

### Established Patterns
- `CLIAdapter` interface pattern (buildArgs + extractText) — superseded by `ModelAdapter` in Phase 6, but the subprocess lifecycle in `ReviewRunner` is reused.
- Webview state machine (`idle → generating → complete | error`) — extended to a per-section state map in Phase 6 (D-05).
- `postMessage` protocol: extension host → webview for state updates. Phase 6 adds `sectionUpdate` message type alongside existing `streamChunk` / `reviewComplete`.
- `getStore()` / `getProvider()` module-level exports in `activation.ts` — orchestrator accesses storage and credentials through these, same as `ReviewPanel.ts` today.

### Integration Points
- `ReviewPanel.ts` → new multi-agent orchestrator replaces the `fetchPRDiff → buildPrompt → runReview` chain with a parallel dispatch loop
- `activation.ts` → no structural change; `easyReview.generateReview` command still routes to `ReviewPanel`
- `package.json` `contributes.configuration` → new `easyReview.defaultModel` and `easyReview.agentModels` settings entries replace `easyReview.activeModel`
- Webview React app → `ReviewDocument` updated: replace 6-section layout with 7-slot progressive layout; add `AgentStatusBar` showing per-agent completion state

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-multi-agent-pr-review-pipeline-with-model-selection*
*Context gathered: 2026-04-04*
