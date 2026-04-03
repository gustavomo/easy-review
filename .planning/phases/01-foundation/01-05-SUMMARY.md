---
phase: 01-foundation
plan: 05
subsystem: github
tags: [typescript, vscode, url-parsing, sqlite, tdd, vitest]

requires:
  - phase: 01-03
    provides: StorageAdapter interface, StoredPR type, SQLiteStore with savePR/deletePR/getPRs
  - phase: 01-04
    provides: EasyReviewPRsProvider with addPR/removePR, AllStatesPRFetcher with fetchPRByNumber

provides:
  - parsePRUrl() function — parses GitHub PR URLs to {owner, repo, prNumber}
  - ParsedPRUrl interface
  - PRPersistenceService class — fetch+persist+tree-update in one call
  - easy-review.addPRByUrl command — URL input with inline validation, progress notification
  - easy-review.removePR command — modal confirmation before deletion
  - package.json menu wiring for both commands

affects:
  - 01-06 (subprocess runner — addPRByUrl TODO stub waiting on Octokit from upstream auth)
  - 02-ai-review (will use PRPersistenceService to pre-check if PR already stored)

tech-stack:
  added: []
  patterns:
    - "TDD with vitest: write test stubs → run (RED) → implement → run (GREEN)"
    - "Thin command handlers: command registers user I/O, service class holds all logic"
    - "Defensive parsing: parsePRUrl returns null for all invalid inputs rather than throwing"

key-files:
  created:
    - src/easy-review/github/PRUrlParser.ts
    - src/easy-review/github/PRPersistenceService.ts
  modified:
    - src/easy-review/activation.ts
    - src/test/unit/url-parser.test.ts
    - package.json

key-decisions:
  - "Octokit wiring deferred to Plan 01-06 — addPRByUrl command registered and validated, but fetchAndPersistPR not yet called (pending upstream auth layer)"
  - "PRPersistenceService constructor takes store + provider — keeps it testable without a VS Code context"

patterns-established:
  - "Thin command handlers: validation + UI in activation.ts, data logic in service class"
  - "URL parser returns null (not throws) for all invalid inputs — safe to call without try/catch"

requirements-completed:
  - PRW-01
  - PRW-02

duration: 12min
completed: 2026-04-03
---

# Phase 01 Plan 05: PRUrlParser, PRPersistenceService, and AddByURL Command Summary

**GitHub PR URL parser with 9 vitest assertions, PRPersistenceService orchestrating fetch+persist+tree-update, and addPRByUrl/removePR commands wired to the command palette and tree view menus**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-03T13:23:00Z
- **Completed:** 2026-04-03T13:25:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced 8 `it.todo()` stubs in url-parser.test.ts with 9 real vitest assertions covering standard URL, trailing slash, query params, cross-repo, GitLab, issues URL, empty string, non-numeric PR number, and missing pull segment
- Implemented PRUrlParser.ts with regex `/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/` — all 9 tests pass
- Implemented PRPersistenceService with `fetchAndPersistPR()` (fetch → convert to StoredPR → store.savePR → provider.addPR) and `removePR()` (store.deletePR → provider.removePR)
- Registered `easy-review.addPRByUrl` command with `showInputBox` + inline `validateInput` using parsePRUrl
- Registered `easy-review.removePR` command with `showWarningMessage` modal confirmation
- Added both commands to `package.json` contributes.commands, view/title menus (addPRByUrl), and view/item/context menu (removePR)

## Task Commits

Each task was committed atomically:

1. **Task 1: PRUrlParser — GitHub PR URL parsing** - `1f6bad9e` (feat)
2. **Task 2: PRPersistenceService and AddByURL command wiring** - `ec7ac0fe` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/easy-review/github/PRUrlParser.ts` — parsePRUrl() and ParsedPRUrl interface
- `src/easy-review/github/PRPersistenceService.ts` — fetchAndPersistPR() and removePR() orchestration
- `src/easy-review/activation.ts` — addPRByUrl and removePR command registrations added
- `src/test/unit/url-parser.test.ts` — replaced todos with 9 real assertions
- `package.json` — contributes.commands + view/title + view/item/context menu entries

## Decisions Made

- **Octokit wiring deferred to Plan 01-06:** The addPRByUrl command registers, validates input, and shows progress — but the actual `fetchAndPersistPR()` call throws a clear "pending" error until the upstream auth layer is wired. This keeps the command functional (palette-accessible, validating) without blocking on the auth work.
- **PRPersistenceService takes store + provider in constructor:** Makes it instantiable and testable without a VS Code context. The command handler retrieves these via `getStore()` / `getProvider()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type] Added explicit `string` type to validateInput parameter**
- **Found during:** Task 2 (activation.ts command wiring)
- **Issue:** IDE reported TS7044 — `value` in validateInput callback implicitly typed as `any`
- **Fix:** Added `: string` annotation to the parameter
- **Files modified:** src/easy-review/activation.ts
- **Verification:** Diagnostic cleared, build exits 0
- **Committed in:** ec7ac0fe (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type annotation)
**Impact on plan:** Minimal — one-line annotation fix, no scope change.

## Issues Encountered

- activation.ts had been updated by parallel Plan 01-04 agent, so the file had new content (SQLiteStore init, provider registration, existing commands). Used Write tool to rewrite the full file incorporating both sets of commands cleanly.
- Edit tool failed twice due to tab vs spaces mismatch in old_string matching — resolved by rewriting the full file.

## Known Stubs

- `easy-review.addPRByUrl` command handler throws `"Octokit integration pending"` error when the user confirms a URL. The URL parsing and validation work; only the fetch call is stubbed. Plan 01-06 will wire Octokit from the upstream auth layer to resolve this.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PRUrlParser and PRPersistenceService are production-ready — no further changes needed
- addPRByUrl command is fully functional except for the Octokit call (Plan 01-06)
- removePR command is fully functional
- Plan 01-06 (SubprocessRunner) should also wire Octokit into PRPersistenceService via the activation.ts command handler

---
*Phase: 01-foundation*
*Completed: 2026-04-03*

## Self-Check: PASSED

- FOUND: src/easy-review/github/PRUrlParser.ts
- FOUND: src/easy-review/github/PRPersistenceService.ts
- FOUND: src/easy-review/activation.ts
- FOUND: src/test/unit/url-parser.test.ts
- FOUND: .planning/phases/01-foundation/01-05-SUMMARY.md
- FOUND: commit 1f6bad9e (feat(01-05): implement PRUrlParser)
- FOUND: commit ec7ac0fe (feat(01-05): add PRPersistenceService and commands)
