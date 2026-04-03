# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Generate deep, context-aware AI reviews of any GitHub PR (open, closed, or merged) directly inside VS Code, with everything persisted locally and shareable to Privanote.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-04-03 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1 prerequisite: Decide `better-sqlite3` vs `sql.js` and test in VS Code extension context before writing storage code
- Phase 1 prerequisite: Implement PATH resolution strategy (settings → shell-env → common paths) — core feature fails without it
- Phase 1 prerequisite: Define minimal-diff policy and upstream sync workflow before writing feature code
- Phase 1 prerequisite: Configure two-target build (esbuild for extension host, Vite for webview)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: `better-sqlite3` + electron-rebuild version matrix against current VS Code Electron version must be verified as first technical spike (MEDIUM confidence in research)
- Phase 2: Exact `claude` CLI output format and flags must be tested empirically before building ReviewParser
- Phase 3: `@modelcontextprotocol/sdk` current API shapes must be verified against current npm version before writing MCPClient
- Phase 4: Current `vsce` platform target flags and Marketplace native module policies must be verified before packaging

## Session Continuity

Last session: 2026-04-03
Stopped at: Roadmap created, STATE.md initialized — ready to plan Phase 1
Resume file: None
