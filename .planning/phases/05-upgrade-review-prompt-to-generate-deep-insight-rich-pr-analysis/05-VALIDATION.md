---
phase: 5
slug: upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green (excluding pre-existing `sqlite.test.ts` ERR_DLOPEN_FAILED failures — unrelated environment issue)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | D-05,D-08 | unit | `npx vitest run src/test/unit/github-fetchers.test.ts` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | D-08,D-09 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | ✅ needs new test | ⬜ pending |
| 5-02-02 | 02 | 1 | D-05,D-06,D-07 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | ✅ needs new test | ⬜ pending |
| 5-02-03 | 02 | 1 | D-04 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | ✅ needs new test | ⬜ pending |
| 5-03-01 | 03 | 1 | D-01,D-02,D-03 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | ✅ needs update | ⬜ pending |
| 5-03-02 | 03 | 1 | D-10,D-11,D-12 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts` | ✅ needs update | ⬜ pending |
| 5-04-01 | 04 | 2 | D-09 | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | ✅ needs update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/unit/github-fetchers.test.ts` — unit tests for `fetchReviewComments` and `fetchPRCommits` with mocked Octokit; covers `per_page: 100`, empty-body filter, and subject-line extraction

*Existing test files `prompt-builder.test.ts` and `review-parser.test.ts` cover the other requirements but need assertions updated for renamed headings and new fields.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generated review output matches Privanote quality bar (Executive Summary depth, annotated diffs, elaborated Mermaid) | D-01 | Output quality is subjective; requires human evaluation against the user-provided example | Run review on a known PR, compare Executive Summary and Key Code Changes sections against the Privanote example output |
| Review comments from GitHub appear in the generated review | D-05,D-06 | Requires a real PR with review comments; Octokit mock can't verify end-to-end rendering | Run review on a PR known to have review comments, confirm they appear in the output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
