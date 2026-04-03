---
phase: 2
slug: ai-review-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.2 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-??-01 | TBD | 0 | REV-01, REV-03 | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-runner.test.ts` | ⬜ pending |
| 2-??-02 | TBD | 0 | REV-02, VIEW-02 | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/review-parser.test.ts` | ⬜ pending |
| 2-??-03 | TBD | 0 | PROJ-03 | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/prompt-builder.test.ts` | ⬜ pending |
| 2-??-04 | TBD | 0 | PROJ-01, PROJ-02 | unit | `npm run test:unit` | ❌ Wave 0: `src/test/unit/project-analysis.test.ts` | ⬜ pending |
| 2-??-05 | TBD | 0 | REV-04, REV-05, VIEW-03 | unit | `npm run test:unit` | ❌ Wave 0: extend `src/test/unit/sqlite.test.ts` | ⬜ pending |
| 2-??-06 | TBD | manual | VIEW-01 | manual-only | — | N/A — requires VS Code context | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/unit/review-runner.test.ts` — stubs for REV-01, REV-03
- [ ] `src/test/unit/review-parser.test.ts` — stubs for REV-02, VIEW-02
- [ ] `src/test/unit/prompt-builder.test.ts` — stubs for PROJ-03
- [ ] `src/test/unit/project-analysis.test.ts` — stubs for PROJ-01, PROJ-02
- [ ] Extend `src/test/unit/sqlite.test.ts` — stubs for REV-04, REV-05, VIEW-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ReviewPanel creates singleton WebviewPanel | VIEW-01 | Requires VS Code extension host context — cannot mock webview panel creation meaningfully in unit tests | Launch extension in Extension Development Host, right-click a PR, verify single panel opens in ViewColumn.Two; open second PR, verify same panel reuses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
