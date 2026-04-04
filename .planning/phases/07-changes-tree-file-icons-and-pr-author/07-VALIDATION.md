---
phase: 7
slug: changes-tree-file-icons-and-pr-author
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `src/test/unit/.vitest.config.ts` |
| **Quick run command** | `npx vitest run --config src/test/unit/.vitest.config.ts` |
| **Full suite command** | `npx vitest run --config src/test/unit/.vitest.config.ts` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --config src/test/unit/.vitest.config.ts`
- **After every plan wave:** Run `npx vitest run --config src/test/unit/.vitest.config.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | D-01 | unit | `npx vitest run --config src/test/unit/.vitest.config.ts src/test/unit/easyReviewTreeNode.test.ts` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | D-02 | unit | `npx vitest run --config src/test/unit/.vitest.config.ts src/test/unit/easyReviewTreeNode.test.ts` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | D-04 | unit | `npx vitest run --config src/test/unit/.vitest.config.ts src/test/unit/prTreeItem.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | D-06 | unit | `npx vitest run --config src/test/unit/.vitest.config.ts src/test/unit/prTreeItem.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 1 | D-07/D-08 | unit | `npx vitest run --config src/test/unit/.vitest.config.ts src/test/unit/prTreeItem.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test/unit/prTreeItem.test.ts` — stubs for PRTreeItem avatar + description tests
- [ ] Add `ThemeIcon.File` and `ThemeIcon.Folder` static properties to `src/test/__mocks__/vscode.ts`

*Existing easyReviewTreeNode.test.ts covers FileNode tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File-type icon renders correctly from active theme | D-01 | VS Code icon theme rendering is visual; cannot be tested via unit test | Open extension, expand a PR, verify `.ts` files show TypeScript icon, `.json` shows JSON icon |
| Avatar image renders in tree item | D-04 | Image rendering from HTTPS URI is a VS Code runtime behavior | Open extension, verify PR items show author avatar instead of codicon |
| Label color decoration preserved | D-03 | Git decoration colors are applied by VS Code's decoration provider at runtime | Open extension, verify changed files still show green/red/yellow label colors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
