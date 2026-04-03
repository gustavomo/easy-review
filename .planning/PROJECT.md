# Easy Review

## What This Is

Easy Review is a VS Code extension — a full fork of Microsoft's GitHub Pull Requests extension — that adds AI-powered code review generation for PRs in all states (open, closed, merged). It shells out to the `claude` and `codex` CLIs to produce structured reviews and stores all generated content (PR data, reviews, comments, project analysis) in a local SQLite database. Reviews can be posted as GitHub comments or sent as notes to Privanote via API.

## Core Value

Generate deep, context-aware AI reviews of any GitHub PR (open, closed, or merged) directly inside VS Code, with everything persisted locally and shareable to Privanote.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browse GitHub PRs by all states: open, closed, and merged
- [ ] One-time project analysis: collect README, key files, architecture map, codebase summary, and past PRs as persistent context
- [ ] AI review generation via `claude` and `codex` CLI subprocesses, informed by Privanote MCP context
- [ ] All generated content (PR data, reviews, comments, project analyses) persisted in local SQLite database
- [ ] Webview panel displaying the full structured AI review and analysis
- [ ] Post review comments to GitHub from within the extension
- [ ] Send full review + AI-generated content to Privanote via API
- [ ] Privanote MCP integration to read existing notes/context before generating reviews

### Out of Scope

- Real-time collaboration or multi-user shared reviews — personal tool first, not a team platform
- Replacing the full GitHub PRs extension UI — fork and extend, don't rebuild what works
- API-based AI invocation (Claude/OpenAI REST) — CLI subprocess is the chosen approach; avoids API key management in the extension
- Automatic review posting without user confirmation — user always controls when content leaves the local store

## Context

- **Source fork:** microsoft/vscode-pull-request-github — provides GitHub auth, PR tree, diff views. The fork adds closed/merged PR browsing and the AI review layer on top.
- **Existing pr-analysis service:** `/Users/gustavo.moreno/Documents/personal info/privanote/apps/pr-analysis` — Python FastAPI service that does similar analysis using ADK agents + Qodo Merge + GPT-4o. This extension replaces that service's role for daily use, using Claude/Codex CLI instead.
- **AI execution model:** Shell out to `claude` and `codex` CLI tools already installed locally. No API key management inside the extension.
- **Privanote integration:** Two-way — MCP server to pull context from Privanote notes before generating reviews; REST API to push the full review + analysis back as a new note.
- **Storage:** SQLite as the single source of truth for all generated content. Enables history, re-use of project analysis across reviews, and offline access.
- **Target audience:** Personal use first (Gustavo's daily workflow). Future: public distribution / VS Code Marketplace with potential monetization.

## Constraints

- **Tech Stack:** TypeScript + VS Code Extension API — required to fork and extend vscode-pull-request-github
- **AI Runtime:** Must have `claude` and `codex` CLI installed on the host machine — extension depends on these being available in PATH
- **Storage:** SQLite via better-sqlite3 or similar — local file, no server dependency
- **GitHub Auth:** Inherit from the forked extension's existing auth mechanism
- **Compatibility:** Must work with VS Code 1.85+ (same baseline as the upstream fork)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork microsoft/vscode-pull-request-github | Reuse battle-tested GitHub auth, PR tree, diff views — avoids rebuilding infrastructure | — Pending |
| CLI subprocess for AI (not API) | No API key management in extension; user already has `claude`/`codex` installed | — Pending |
| SQLite for all persistence | Single source of truth for PR data, reviews, comments, analyses — queryable history | — Pending |
| Privanote MCP for context input | Pull relevant notes/context before generating reviews for deeper insights | — Pending |
| Privanote API for output | Push full review to Privanote as a note for searchable history outside VS Code | — Pending |
| Local-first, post-on-demand | User controls when comments go to GitHub — no accidental posts | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-03 after initialization*
