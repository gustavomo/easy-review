---
phase: 02-ai-review-generation
plan: 03
subsystem: cli
tags: [octokit, diff, prompt, parser, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-ai-review-generation/02-02
    provides: shared types (ReviewSection, Finding, StoredProjectAnalysis) and storage layer

provides:
  - DiffFetcher.ts: fetchPRDiff(octokit, owner, repo, prNumber) — fetches PR patch diff from GitHub using diff media type
  - PromptBuilder.ts: buildPrompt(opts) — assembles 6-section review prompt with optional project context prepended
  - ReviewParser.ts: parseReview(rawText) — splits raw CLI output into ReviewSection[] by H2 headings
  - ReviewParser.ts: parseFindingsSection(content) — extracts Finding[] with severity from Findings section body
  - 12 passing unit tests covering all public interfaces

affects:
  - 02-04-plan (ReviewRunner calls buildPrompt + parseReview in pipeline)
  - 02-07-plan (ReviewPanel calls DiffFetcher → PromptBuilder → CLI → ReviewParser in sequence)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Diff fetch: octokit diff media type via (octokit as any).rest.pulls.get with mediaType format"
    - "Prompt assembly: template parts joined with separator, project context prepended when non-null"
    - "Output parsing: matchAll with global regex over H2 headings, slice-based section extraction"
    - "Finding parsing: line-by-line severity marker detection, continuation lines appended to prior finding"

key-files:
  created:
    - src/easy-review/github/DiffFetcher.ts
    - src/easy-review/cli/PromptBuilder.ts
    - src/easy-review/cli/ReviewParser.ts
  modified:
    - src/test/unit/prompt-builder.test.ts
    - src/test/unit/review-parser.test.ts

key-decisions:
  - "Octokit diff type: cast via (octokit as any).rest and response.data as unknown as string — Octokit TS types do not correctly type diff format response"
  - "Prompt separator: sections joined with newline--newline so sections are clearly delimited in the prompt body"
  - "Findings detection: title.toLowerCase().includes('finding') to match variants like 'Key Findings'"
  - "Parser fallback: no ## headings → single ReviewSection with title 'Review' and full rawText as content"

patterns-established:
  - "Pattern: TDD Red-Green for pure utility modules — write failing import test, then implement"
  - "Pattern: Findings section identified by normalized title containing 'finding' substring"

requirements-completed: [REV-02, PROJ-03]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 2 Plan 3: DiffFetcher, PromptBuilder, ReviewParser Summary

**Three stateless utility modules forming the CLI data pipeline: diff fetch via Octokit diff media type, 6-section prompt assembly with optional project context, and H2-heading-based review parser with severity-tagged findings extraction.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T16:23:41Z
- **Completed:** 2026-04-03T16:25:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- DiffFetcher fetches PR unified diff from GitHub using Octokit's diff media type, with the accepted `as unknown as string` workaround for incorrect Octokit types
- PromptBuilder assembles the full 6-section review prompt including optional project context (D-09), PR metadata, commit messages, diff, and output format instructions
- ReviewParser splits raw CLI output into ReviewSection[] by `## H2` headings (case-insensitive) with graceful fallback, and extracts Finding[] with severity detection from the Findings section
- All 12 test stubs from Plan 01 replaced with passing assertions; npm run test:unit exits 0 (8 files pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: DiffFetcher and PromptBuilder** - `b590dfa6` (feat)
2. **Task 2: ReviewParser** - `b4257987` (feat)

_Note: TDD tasks: tests written first (RED confirmed via import error), then implementation (GREEN confirmed via passing tests)_

## Files Created/Modified

- `src/easy-review/github/DiffFetcher.ts` - fetchPRDiff using octokit diff media type
- `src/easy-review/cli/PromptBuilder.ts` - buildPrompt assembling 6-section review prompt
- `src/easy-review/cli/ReviewParser.ts` - parseReview and parseFindingsSection
- `src/test/unit/prompt-builder.test.ts` - 6 real assertions replacing it.todo stubs
- `src/test/unit/review-parser.test.ts` - 6 real assertions replacing it.todo stubs

## Decisions Made

- Octokit diff media type: cast `octokit as any` since `@octokit/rest` types do not expose `mediaType` option on `pulls.get` in TypeScript. `response.data as unknown as string` is the documented workaround.
- Prompt separator: `\n\n---\n\n` between sections for clear visual delimiter in the prompt body sent to CLI.
- Findings title detection: `normalizedTitle.includes('finding')` rather than exact match to handle variants like "Key Findings".
- Fallback section: `{ title: 'Review', content: rawText.trim() }` when no H2 headings found — aligns with RESEARCH.md Pitfall 2 (non-deterministic LLM output).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

A pre-existing test failure was observed in `review-runner.test.ts > exports runReview function` (ReviewRunner module not yet implemented — planned for a later plan). This failure was pre-existing from the parallel Plan 02-04 execution and is not caused by this plan's changes. The test was passing by the end of this plan because ReviewRunner was implemented by that parallel agent.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DiffFetcher, PromptBuilder, and ReviewParser are ready for use by ReviewRunner (Plan 04) and ReviewPanel (Plan 07)
- All three modules are pure functions with no VS Code API dependencies — easy to unit test and compose
- No blockers for downstream plans

---
*Phase: 02-ai-review-generation*
*Completed: 2026-04-03*
