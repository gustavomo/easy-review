---
phase: 6
slug: multi-agent-pr-review-pipeline-with-model-selection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already configured) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit -- --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit -- --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-W0-01 | W0 | 0 | D-03,D-04,D-05 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |
| 06-W0-02 | W0 | 0 | D-11 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |
| 06-W0-03 | W0 | 0 | D-14 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |
| 06-W0-04 | W0 | 0 | D-16,D-17 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |
| 06-W0-05 | W0 | 0 | D-01 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |
| 06-W0-06 | W0 | 0 | D-19 | unit | `npm run test:unit` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/easy-review/agents/AgentOrchestrator.test.ts` — stubs for D-03 (7 agents dispatched concurrently), D-04 (progressive rendering), D-05 (7-slot SectionState map)
- [ ] `src/easy-review/cli/OllamaAdapter.test.ts` — stubs for D-11 (ndjson streaming, fetch mock)
- [ ] `src/easy-review/agents/contextRequest.test.ts` — stubs for D-14 (CONTEXT_REQUEST header parser)
- [ ] `src/easy-review/agents/mermaidValidation.test.ts` — stubs for D-16 (extension-host regex validation), D-17 (retry max 2)
- [ ] `src/easy-review/cli/ReviewParser.test.ts` (update) — extend existing file with 7 new section name cases for D-01
- [ ] `src/easy-review/settings/modelSettings.test.ts` — stubs for D-19 (activeModel → defaultModel migration)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7 agents run visibly in parallel in VS Code webview | D-03/D-04 | Requires live VS Code webview; no headless renderer | Open PR, trigger review, observe AgentStatusBar slots cycling through pending→generating→complete |
| ADK `query()` subprocess spawns correct claude CLI path from settings | D-07 | Requires live claude CLI install; subprocess paths can't be mocked end-to-end | Set `easyReview.claudePath` in VS Code settings; verify OutputChannel shows correct spawn path |
| OllamaAdapter HTTP call works against running Ollama server | D-11 | Requires live Ollama; HTTP mock tests logic only | Start Ollama with gemma4; trigger review with `easyReview.defaultModel: "ollama"`; verify section output |
| Diagram retry triggers on invalid Mermaid; shows raw + banner after 2 failures | D-16/D-17/D-18 | Requires live review with a PR that generates invalid Mermaid | Force invalid diagram output; observe orchestrator re-prompt; after 2 failures verify ⚠️ banner rendered |
| `easyReview.agentModels` settings override respected per-agent | D-19/D-20 | Requires VS Code settings UI | Set `"bugRisk": "codex"` while `defaultModel: "claude"`; verify OutputChannel shows codex subprocess for bugRisk only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
