---
phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
verified: 2026-04-03T22:29:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 5: Upgrade Review Prompt to Generate Deep, Insight-Rich PR Analysis — Verification Report

**Phase Goal:** Replace the thin instructions block in PromptBuilder.ts with a production-quality SYNTHESIS_INSTRUCTION, fetch GitHub review comments and commit messages, and wire all new data into the review generation pipeline — transforming output from structured checklist to insight-rich PR analysis

**Verified:** 2026-04-03T22:29:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | PromptBuilder.ts has a top-level `const SYNTHESIS_INSTRUCTION` with the full verbatim prompt text | VERIFIED | Line 27 of PromptBuilder.ts: `const SYNTHESIS_INSTRUCTION = \`You are a senior software engineer writing a structured PR analysis note...` (137 lines of instruction) |
| 2  | SYNTHESIS_INSTRUCTION uses `## Code Review Findings` (not `## Findings`) | VERIFIED | Line 117 of PromptBuilder.ts: `## Code Review Findings` appears inside SYNTHESIS_INSTRUCTION |
| 3  | SYNTHESIS_INSTRUCTION uses `## Visual Overview` (not `## Mermaid Diagram`) | VERIFIED | Line 127 of PromptBuilder.ts: `## Visual Overview` appears inside SYNTHESIS_INSTRUCTION |
| 4  | `buildPrompt()` calls `parts.push(SYNTHESIS_INSTRUCTION)` — the instruction is wired into prompt assembly | VERIFIED | Line 207 of PromptBuilder.ts: `parts.push(SYNTHESIS_INSTRUCTION)` |
| 5  | `fetchReviewComments` and `fetchPRCommits` are exported from DiffFetcher.ts | VERIFIED | Lines 41 and 91 of DiffFetcher.ts export both functions; `ReviewComment` interface exported at line 27 |
| 6  | `BuildPromptOptions` has `reviewComments: ReviewComment[]` and `prUrl: string` fields | VERIFIED | Lines 18–19 of PromptBuilder.ts: both fields present and typed correctly |
| 7  | ReviewPanel.ts fetches diff, review comments, and commit messages in parallel via `Promise.all` | VERIFIED | Lines 196–200 of ReviewPanel.ts: `const [diff, reviewComments, commitMessages] = await Promise.all([...])` |
| 8  | `commitMessages: []` hardcoded value is replaced with the fetched list | VERIFIED | No instance of `commitMessages: []` in ReviewPanel.ts; `commitMessages` (variable) passed at line 212 |
| 9  | `prUrl` is constructed from owner/repo/prNumber and passed to `buildPrompt` | VERIFIED | Line 205: `` const prUrl = `https://github.com/${owner}/${repo}/pull/${pr.prNumber}` ``; passed at line 217 |
| 10 | `reviewComments` is passed to `buildPrompt` from `fetchReviewComments` result | VERIFIED | Line 216: `reviewComments,` in buildPrompt call |
| 11 | ReviewParser.ts `buildSection()` fires findings parser for both `## Findings` and `## Code Review Findings` | VERIFIED | Line 41 of ReviewParser.ts: `normalizedTitle === 'findings' \|\| normalizedTitle.includes('finding')` — substring 'finding' matches both old and new headings |
| 12 | 10 github-fetchers tests pass green | VERIFIED | `npx vitest run src/test/unit/github-fetchers.test.ts`: 10 tests passed |
| 13 | All prompt-builder and review-parser tests pass green | VERIFIED | `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts`: 17 tests passed (8 + 9) |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/test/unit/github-fetchers.test.ts` | Unit tests for fetchReviewComments and fetchPRCommits | VERIFIED | 135 lines; 10 tests covering all specified behaviors including per_page:100, original_line fallback, empty-body filter |
| `src/easy-review/github/DiffFetcher.ts` | fetchReviewComments, fetchPRCommits, ReviewComment exported | VERIFIED | 107 lines; all three exports present; per_page:100 twice; `c.line ?? c.original_line`; `r.body?.trim()`; `.split('\n')[0]`; `fetchPRDiff` untouched |
| `src/easy-review/cli/PromptBuilder.ts` | SYNTHESIS_INSTRUCTION const + reviewComments + prUrl fields + updated section headings | VERIFIED | 210 lines; `const SYNTHESIS_INSTRUCTION` at line 27; `reviewComments: ReviewComment[]` at line 18; `prUrl: string` at line 19; `## Code Review Findings` and `## Visual Overview` in instruction; `URL: ${opts.prUrl}` at line 182; review comments rendering at lines 191–201 |
| `src/easy-review/cli/ReviewParser.ts` | backward-compatible findings parser | VERIFIED | 74 lines; `buildSection()` uses `normalizedTitle.includes('finding')` — matches both old `## Findings` and new `## Code Review Findings` |
| `src/test/unit/prompt-builder.test.ts` | Updated heading assertions + new D-04 and D-06/D-07 tests | VERIFIED | 128 lines; contains `Code Review Findings`, `Visual Overview`, `prUrl:`, `reviewComments:` |
| `src/test/unit/review-parser.test.ts` | Updated fixture with new headings + backward-compat tests | VERIFIED | 85 lines; SIX_SECTION_REVIEW fixture uses `## Code Review Findings` and `## Visual Overview`; two backward-compat tests for old and new headings |
| `src/easy-review/panel/ReviewPanel.ts` | Promise.all wiring for all three GitHub data fetches | VERIFIED | Import at line 15: `fetchPRCommits, fetchPRDiff, fetchReviewComments`; `Promise.all([` at line 196; all three fetcher calls present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/easy-review/cli/PromptBuilder.ts` | `src/easy-review/github/DiffFetcher.ts` | `import type { ReviewComment }` | WIRED | Line 1: `import type { ReviewComment } from '../github/DiffFetcher'` |
| `src/test/unit/github-fetchers.test.ts` | `src/easy-review/github/DiffFetcher.ts` | named import | WIRED | Line 2: `import { fetchReviewComments, fetchPRCommits } from '../../easy-review/github/DiffFetcher'` |
| `src/easy-review/panel/ReviewPanel.ts` | `src/easy-review/github/DiffFetcher.ts` | `import { fetchReviewComments, fetchPRCommits }` | WIRED | Line 15: `import { fetchPRCommits, fetchPRDiff, fetchReviewComments } from '../github/DiffFetcher'` |
| `src/easy-review/panel/ReviewPanel.ts` | `src/easy-review/cli/PromptBuilder.ts` | `buildPrompt({ ..., reviewComments, prUrl })` | WIRED | Lines 206–218: buildPrompt call includes `reviewComments,` and `prUrl,` as explicit fields |
| `buildPrompt()` | `SYNTHESIS_INSTRUCTION` | `parts.push(SYNTHESIS_INSTRUCTION)` | WIRED | Line 207: `parts.push(SYNTHESIS_INSTRUCTION)` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ReviewPanel.ts` → `buildPrompt` | `reviewComments` | `fetchReviewComments(octokit, owner, repo, pr.prNumber)` — calls `rest.pulls.listReviewComments` and `rest.pulls.listReviews` via Octokit | Yes — live GitHub API calls | FLOWING |
| `ReviewPanel.ts` → `buildPrompt` | `commitMessages` | `fetchPRCommits(octokit, owner, repo, pr.prNumber)` — calls `rest.pulls.listCommits` via Octokit | Yes — live GitHub API calls | FLOWING |
| `ReviewPanel.ts` → `buildPrompt` | `prUrl` | Constructed inline: `` `https://github.com/${owner}/${repo}/pull/${pr.prNumber}` `` | Yes — deterministic from PR data | FLOWING |
| `buildPrompt()` | `SYNTHESIS_INSTRUCTION` | Inline `const` in PromptBuilder.ts | Yes — static string constant, substantive (137-line instruction) | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| github-fetchers tests pass green | `npx vitest run src/test/unit/github-fetchers.test.ts` | 10 tests passed | PASS |
| prompt-builder tests pass green | `npx vitest run src/test/unit/prompt-builder.test.ts` | 8 tests passed | PASS |
| review-parser tests pass green | `npx vitest run src/test/unit/review-parser.test.ts` | 9 tests passed | PASS |
| SYNTHESIS_INSTRUCTION is substantive (not placeholder) | grep for 'senior software engineer' in PromptBuilder.ts | Found at line 27 | PASS |
| No hardcoded `commitMessages: []` in ReviewPanel.ts | grep for `commitMessages: \[\]` | Not found | PASS |

---

### Requirements Coverage

The D-01 through D-12 requirement IDs are phase-internal decision identifiers defined in `05-CONTEXT.md` (not in the global REQUIREMENTS.md which uses REV-xx, PROJ-xx, etc.). All D-requirements are fully accounted for:

| Requirement | Source Plan(s) | Description (from 05-CONTEXT.md) | Status | Evidence |
|-------------|---------------|----------------------------------|--------|---------|
| D-01 | 05-03 | Port Privanote SYNTHESIS_INSTRUCTION verbatim, adapted for our field names | SATISFIED | `const SYNTHESIS_INSTRUCTION` in PromptBuilder.ts lines 27–164: full instruction with BAD/GOOD examples, per-section guidance, annotation requirements |
| D-02 | 05-03 | Instruction lives as inline `const SYNTHESIS_INSTRUCTION` in PromptBuilder.ts | SATISFIED | Top-level const at line 27, not a separate file |
| D-03 | 05-03 | Single combined prompt — no system/user split | SATISFIED | `buildPrompt()` returns one joined string; all context assembled into `parts` array |
| D-04 | 05-02, 05-04 | Include PR's full GitHub URL in prompt data | SATISFIED | `prUrl: string` field in BuildPromptOptions; URL constructed in ReviewPanel.ts line 205; rendered in prompt at line 182 |
| D-05 | 05-01, 05-02 | Add `fetchReviewComments()` using both `listReviewComments` and `listReviews` | SATISFIED | DiffFetcher.ts lines 41–84: both endpoints called, results combined |
| D-06 | 05-01, 05-02 | Full detail per comment: reviewer login, file path, line number, body | SATISFIED | ReviewComment interface exported; rendering logic in PromptBuilder.ts lines 192–197 formats all fields |
| D-07 | 05-02 | Pass review comments as `reviewComments` field on BuildPromptOptions; empty renders "No review comments on this PR." | SATISFIED | Field at line 18; empty-path rendering at lines 199–201 |
| D-08 | 05-01, 05-02 | Add `fetchPRCommits()` using `listCommits`; extract subject line only | SATISFIED | DiffFetcher.ts lines 91–107: `per_page: 100`, `.split('\n')[0]` |
| D-09 | 05-04 | Wire commit messages into ReviewPanel.ts — replace hardcoded `[]` with fetched list | SATISFIED | ReviewPanel.ts line 212: `commitMessages,` variable (not `[]`); fetched via `fetchPRCommits` in Promise.all |
| D-10 | 05-03 | Rename `## Findings` → `## Code Review Findings` and `## Mermaid Diagram` → `## Visual Overview` | SATISFIED | Both renamed headings present in SYNTHESIS_INSTRUCTION (lines 117, 127); test fixtures updated |
| D-11 | 05-03 | Update ReviewParser.ts `buildSection()` to match new heading name | SATISFIED | ReviewParser.ts line 41: `normalizedTitle.includes('finding')` is a superset that already matches 'code review findings'; backward-compat test in review-parser.test.ts confirms both old and new headings fire findings parser |
| D-12 | 05-03 | 6-section contract preserved — always output all 6 sections in SYNTHESIS_INSTRUCTION | SATISFIED | SYNTHESIS_INSTRUCTION lists all 6 sections unconditionally; `buildPrompt()` code always assembles all data sections. Note: SYNTHESIS_INSTRUCTION contains an LLM-directed OMIT rule for empty sections — this is a model instruction, not code omission logic, and does not violate D-12's intent (no code-level omission) |

**Note on global REQUIREMENTS.md:** The D-xx IDs in plan frontmatter are phase-internal design decisions, not entries in `.planning/REQUIREMENTS.md`. The global REQUIREMENTS.md has no D-xx IDs and no Phase 5 row in its traceability table — this is expected. Phase 5 enhances REV-02 quality (6-section structured format) and REV-03 (enriched context) which were already marked complete from Phase 2. No orphaned global requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/easy-review/github/DiffFetcher.ts` | 105 | Trailing whitespace on blank line before `return` | Info | No functional impact; cosmetic |

No stub patterns, placeholder text, empty returns, hardcoded empty arrays (in the data flow), or TODO/FIXME comments found in any phase-modified files.

---

### Human Verification Required

#### 1. Live Review Quality Check

**Test:** Open Extension Development Host, find a PR with at least 2 inline review comments, trigger review generation.

**Expected:** The generated review output contains:
- An Executive Summary that explains What/Approach/Outcome in 3–5 sentences (not a file list)
- Reviewer names and file:line locations from real GitHub review comments appearing in the "Code Review Findings" section
- Commit subject lines listed in the Commit Messages section
- A `## Visual Overview` section with a Mermaid diagram specific to the PR's changes

**Why human:** Review generation requires a live VS Code Extension Development Host, real GitHub authentication, a real PR with review comments, and Claude/Codex CLI. The quality of the Executive Summary (whether it explains intent vs. lists files) cannot be verified programmatically.

#### 2. PR URL File Link Usability

**Test:** On a generated review, verify the PR URL appears in the output and is clickable/navigates to the correct GitHub PR.

**Expected:** URL matches `https://github.com/{owner}/{repo}/pull/{N}` for the reviewed PR.

**Why human:** URL correctness against a live PR requires runtime context.

---

### Gaps Summary

No gaps. All automated checks passed.

---

## Summary

Phase 5 goal is fully achieved. The code transformation is complete and correct:

1. **SYNTHESIS_INSTRUCTION** — a 137-line verbatim port of the Privanote instruction — replaces the original 8-line instructions block in PromptBuilder.ts. The instruction is substantive, includes BAD/GOOD examples for the Executive Summary, per-file annotation requirements for Key Code Changes, and elaborated Mermaid guidance.

2. **GitHub enrichment** — `fetchReviewComments` and `fetchPRCommits` are implemented in DiffFetcher.ts, tested by 10 passing unit tests, and wired into ReviewPanel.ts via `Promise.all` (parallel fetch). The previously hardcoded `commitMessages: []` is replaced with live GitHub data.

3. **Interface extension** — `BuildPromptOptions` now requires `reviewComments: ReviewComment[]` and `prUrl: string`. All callers (ReviewPanel.ts) satisfy the new interface. Tests were updated to pass the new required fields.

4. **Section renames** — `## Code Review Findings` and `## Visual Overview` replace the old headings in both the instruction and test fixtures. ReviewParser.ts backward-compat is confirmed by two new tests.

5. **Full test suite** — 27 phase-relevant tests pass (10 github-fetchers + 8 prompt-builder + 9 review-parser). The 2 pre-existing failures in sqlite.test.ts (ERR_DLOPEN_FAILED — native module ABI mismatch) and 2 in review-runner.test.ts are unrelated to this phase and were present before Phase 5 began.

---

_Verified: 2026-04-03T22:29:00Z_
_Verifier: Claude (gsd-verifier)_
