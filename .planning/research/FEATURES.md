# Feature Landscape

**Domain:** AI-powered code review VS Code extension
**Researched:** 2026-04-03
**Source note:** Web search and fetch were unavailable during this research session.
Findings are drawn from: (1) the existing pr-analysis service that Easy Review
replaces (`privanote/apps/pr-analysis`), which was built after direct use of
CodeRabbit, Qodo Merge, and GitHub Copilot review; (2) the PROJECT.md
requirements; (3) training-data knowledge of the VS Code extension ecosystem and
AI code review tools (confidence noted per finding).

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PR list by state (open / closed / merged) | Users review PRs in all states, not just open. Closed/merged is critical for historical audit. | Low | Upstream fork only shows open; extending to all states is a core requirement. |
| PR diff view | Without seeing what changed, no review is possible. | Low | Inherited from the upstream vscode-pull-request-github fork. |
| One-click review generation | Users expect a single trigger to go from "selected PR" to "full review." | Medium | Must invoke `claude`/`codex` CLI as subprocess with assembled context. |
| Structured review output displayed in webview | Raw AI output is not acceptable; users expect organized sections (summary, findings, changes, suggestions). | Medium | The existing pr-analysis agent prompt defines the canonical section structure (executive summary, categorized changes, key code changes, findings, impact, visual overview). |
| Review persistence across sessions | If the review disappears on window close, users will not trust the tool for daily use. | Medium | SQLite as single source of truth. Re-opening VS Code must restore all reviews. |
| PR metadata in the review | Title, author, branch names, +/- line counts, file list. Without this, the review has no anchor. | Low | Fetched from GitHub REST API. |
| Error / progress feedback | CLI subprocesses can take 30–90 seconds. Users need visible progress (not a frozen UI). | Medium | Webview progress indicator + status updates from subprocess stdout/stderr. |
| GitHub auth inheritance | Users expect the extension to use the existing GitHub session — no second login. | Low | Inherited from the upstream fork's auth mechanism. |

---

## Differentiators

Features that set this product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Codebase-aware context (one-time project analysis) | Generic AI review comments are useless ("consider adding error handling"). Context-aware reviews reference actual patterns, naming conventions, and architecture from the codebase. | High | Collect README, key files (entry points, shared utilities, architecture docs), and a summary of recent PRs. Persist in SQLite. Feed as prefix context to every review prompt. |
| Deep structured review sections | The pr-analysis agent prompt defines exactly what makes a review valuable: Executive Summary that explains intent (not just diffs), Before/After code snippets with inline commentary, Mermaid diagrams for flow changes, Risk classification. Most tools produce bullet-point lists; structured narrative is the differentiator. | High | Re-use and extend the SYNTHESIS_INSTRUCTION from the existing agent. Translate to a CLI prompt template. |
| Review history across all PRs | Users build institutional knowledge by re-reading past reviews. Searchable local history is not available in cloud tools without subscription. | Medium | SQLite query layer. Webview with review list + detail navigation. |
| Privanote MCP context injection | Before generating a review, pull relevant notes from Privanote (e.g., architecture decisions, known issues, team conventions). This is impossible with any cloud tool. | High | Requires MCP client call to `privanote` MCP server. Results injected into the review prompt as an additional context section. |
| Post review to Privanote as a note | Makes the review a first-class note in the personal knowledge base, searchable and linkable from other notes. Cloud tools do not integrate with personal PKM tools. | Medium | REST API call to Privanote with the rendered markdown review. |
| Post review as GitHub PR comment | Close the loop — review was useful, so publish it as an actual GitHub comment without leaving VS Code. | Medium | GitHub REST API `POST /repos/{owner}/{repo}/pulls/{number}/reviews` or `POST /repos/{owner}/{repo}/issues/{number}/comments`. User must confirm before posting. |
| Mermaid diagram generation per PR | Visual representation of what the PR actually changes — flow diagrams, state transitions, component relationships. Not just code diffs. | High | Part of the structured review prompt. Webview must render Mermaid (use `mermaid.js` in the webview). |
| Dual-CLI review strategy (Claude + Codex) | Two independent AI perspectives on the same PR can catch different classes of issues. Claude excels at architecture/narrative; Codex at specific code correctness. | High | Run both CLIs, display as tabs or merged view. |
| Severity-classified findings | Most tools output a flat list. Grouping by critical / warning / suggestion lets users triage at a glance. | Low | Prompt engineering in the review template. |
| Re-generate review (refresh) | Requirements change, new commits are pushed. Being able to re-run a review without re-entering context is critical for iterative use. | Low | Trigger review generation again for an already-stored PR; append new review with timestamp. |

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| API key management in the extension | Forces users to handle secrets in VS Code settings (unencrypted, synced to cloud by default). Adds credential theft surface. PROJECT.md explicitly excludes this. | CLI subprocess model: `claude` and `codex` are already authenticated by the user at the OS level. |
| Automatic review posting (no confirmation) | Users will stop trusting the tool the first time it posts an embarrassing comment. AI output must be human-verified before publishing. | "Post to GitHub" and "Send to Privanote" are always explicit user actions with a confirmation step. |
| Real-time / always-on review (every save or commit) | This is expensive, noisy, and burns through API quota. Not appropriate for a personal tool. | On-demand, triggered by user intent. |
| Team collaboration features (shared reviews, role-based access, review queues) | This is a personal tool first. Multi-user adds significant auth complexity, data sync concerns, and scope creep. | Personal use first; consider team features only after market validation (potential future Marketplace offering). |
| Rebuild what the upstream fork already provides | The fork provides GitHub auth, PR tree view, diff views, webview infrastructure. Rebuilding any of these wastes time. | Extend, don't replace. Add only what the fork does not have. |
| Review suggestions applied as code edits (auto-apply) | Automatically modifying workspace files based on AI suggestions is dangerous and hard to undo. Users lose confidence. | Show suggestions in the review panel; user manually applies if they agree. |
| Cloud sync of the SQLite database | Adds backend infrastructure, sync conflict complexity, and user privacy concerns. Against the local-first design principle. | SQLite stays local. Privanote is the deliberate "cloud export" mechanism for content users want to preserve externally. |
| Multi-repo simultaneous review | Complex state management for minimal gain. Users review one PR at a time. | Single active review at a time. History panel provides access to past reviews. |

---

## Feature Dependencies

The arrows below indicate "requires" (→ = depends on).

```
PR list (all states)
  → GitHub auth (inherited from fork)
  → GitHub REST API access

Review generation
  → PR metadata fetch
  → PR diff fetch
  → Claude CLI subprocess
  → Codex CLI subprocess (optional, dual-model path)
  → Project analysis context (optional but strongly recommended)
  → Privanote MCP context (optional enrichment)

Review display (webview)
  → Review generation
  → Mermaid.js in webview bundle
  → Structured review format (sections contract)

Review persistence
  → SQLite setup (migrations, schema)
  → Review generation

Post to GitHub
  → Review persistence (review must be stored before posting)
  → User confirmation step
  → GitHub REST API (write scope token)

Post to Privanote
  → Review persistence
  → User confirmation step
  → Privanote REST API credentials

Project analysis (one-time codebase context)
  → Repository file access (local workspace or GitHub API)
  → Claude CLI subprocess
  → SQLite persistence (store analysis result for re-use)

Privanote MCP context injection
  → Privanote MCP server running locally
  → MCP client integration in the extension
  → Project analysis (MCP query is informed by project domain)
```

---

## Review Structure Contract

Based on the SYNTHESIS_INSTRUCTION from the existing pr-analysis agent, the canonical sections for a high-quality structured review are:

1. **Executive Summary** — 3–5 sentences on what problem is solved, what the approach was, and what the tangible outcome is. Must explain intent, not restate diffs.
2. **Categorized Changes** — Files grouped by category (Features, Fixes, Refactors, Tests, Config). One line per file explaining what the change accomplishes.
3. **Key Code Changes** — For each file with substantive logic changes: Before/After code snippets extracted from the diff, with detailed inline commentary explaining intent and connecting to the PR goal.
4. **Code Review Findings** — Grouped by severity (critical, warning, suggestion). Only real findings from the diff — never invented.
5. **Impact Analysis** — Risk level (low/medium/high) with justification, areas affected, side effects.
6. **Visual Overview** — Mermaid diagram specific to the PR (sequence, graph, state, or before/after comparison). Skip only for trivial changes.

This structure is the primary differentiator. It must be enforced via the prompt template.

---

## What Makes a Review Genuinely Useful vs Generic

The pr-analysis agent prompt contains a concrete example of this distinction:

**Generic (useless):** "This PR removes BulkDisburseBankAccountWarning import and JSX."

**Useful:** "Removes the bank account warning banner from the loans disbursement flow. The warning was shown before bulk disbursal to flag accounts without a registered bank account. This component has been superseded by the new inline validation in the DisbursementsList, making the pre-flight warning redundant and reducing visual noise in the confirmation modal."

The key principles for usefulness:
- Infer intent from file names, component names, and diff context — do not just mirror the diff
- Connect code changes to user-facing or system-level outcomes
- Before/After snippets must have commentary that explains WHY, not just WHAT
- Findings must be specific to THIS codebase, not generic "add error handling" advice
- Mermaid diagrams must use real names from the code (function names, component names, error types)

**Codebase context is the multiplier.** A review generated without project context defaults to generic patterns. A review informed by the project's architecture, naming conventions, and past PR history can be genuinely specific.

---

## Local-First Storage Patterns

The canonical pattern for AI review storage in a personal VS Code extension:

- **SQLite as single source of truth** for all generated content: PR metadata snapshots, full review text, individual findings, project analysis.
- **Snapshots, not live data**: Store a snapshot of the PR at review time (metadata, diff, file list). The PR may merge or be updated; the review context must remain stable.
- **Project analysis as a long-lived record**: The one-time project analysis is expensive to generate. Store it separately from individual reviews; re-use across all reviews for the project.
- **Review versioning**: A PR can be reviewed multiple times (re-runs after new commits). Store each review with a timestamp; display as a list with the most recent first.
- **Offline access**: All historical reviews accessible without network. Network required only for new PR data fetch and AI generation.
- **No purge by default**: Users should control deletion. The database grows slowly (text only, no binary blobs beyond raw diffs).

---

## MVP Recommendation

Prioritize:
1. PR browsing for all states (open/closed/merged) — without this the core loop is broken
2. Review generation via Claude CLI — single model is sufficient for MVP
3. Structured review display in webview — the quality contract must be established from day one
4. SQLite persistence — reviews disappearing after session close would kill daily use immediately
5. Project analysis (one-time context) — this is the differentiator that makes reviews non-generic; include in MVP even if the UX is rough

Defer to later phases:
- Codex CLI (dual-model) — adds value but Claude alone is functional
- Privanote MCP context injection — valuable enrichment, not core loop
- Post to Privanote — useful but not day-one blocking
- Post to GitHub as comment — nice-to-have, not the core value
- Mermaid rendering in webview — include the content in the review; rendering can be iterated

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Review section structure | HIGH | Directly from the existing pr-analysis agent SYNTHESIS_INSTRUCTION |
| What makes reviews useful vs generic | HIGH | Directly from the pr-analysis agent prompt + battle-tested examples |
| Table stakes features | HIGH | PROJECT.md requirements + derived from daily-use workflow needs |
| Differentiators | MEDIUM | Training data on CodeRabbit/Qodo/Copilot capabilities (web verification unavailable) |
| Anti-features | HIGH | Explicit exclusions in PROJECT.md plus known failure modes from building the pr-analysis service |
| Local-first storage patterns | HIGH | PROJECT.md decision + general SQLite extension patterns (well-established) |
| Feature dependencies | HIGH | Architectural derivation from requirements, no external verification needed |

---

## Sources

- `/Users/gustavo.moreno/Documents/personal info/easy-review/.planning/PROJECT.md` — requirements, constraints, key decisions, explicit out-of-scope items
- `/Users/gustavo.moreno/Documents/personal info/privanote/apps/pr-analysis/src/pr_insight/domain/agent.py` — SYNTHESIS_INSTRUCTION defining the canonical review structure and quality criteria
- `/Users/gustavo.moreno/Documents/personal info/privanote/apps/pr-analysis/src/pr_insight/domain/pipeline.py` — pipeline phases, data assembly pattern, fallback format
- `/Users/gustavo.moreno/Documents/personal info/privanote/apps/pr-analysis/src/pr_insight/domain/models.py` — data model for PR analysis (findings, descriptions, improvements, metadata)
- `/Users/gustavo.moreno/Documents/personal info/privanote/apps/pr-analysis/src/pr_insight/adapters/qodo_adapter.py` — what data the existing system fetches from GitHub (diff, files, review comments)
- Training data (confidence: MEDIUM) for competitive landscape (CodeRabbit, Qodo Merge, GitHub Copilot PR review)
