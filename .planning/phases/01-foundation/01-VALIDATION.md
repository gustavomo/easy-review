---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (extension host unit) + `@vscode/test-electron` (integration) |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npm run test:unit` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds (unit) / ~60 seconds (integration) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit), 60 seconds (integration)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| spike-sqlite | 01 | 0 | DB-01 | integration | `node scripts/sqlite-spike.js` | ❌ W0 | ⬜ pending |
| fork-setup | 01 | 0 | PRW-01 | manual | Verify sidebar shows PRs | ❌ W0 | ⬜ pending |
| storage-adapter | 01 | 1 | DB-01 | unit | `npm run test:unit -- storage` | ❌ W0 | ⬜ pending |
| sqlite-init | 01 | 1 | DB-01, DB-02 | unit | `npm run test:unit -- sqlite` | ❌ W0 | ⬜ pending |
| pr-provider | 01 | 2 | PRW-01, PRW-02 | integration | `npm run test -- pr-provider` | ❌ W0 | ⬜ pending |
| add-by-url | 01 | 2 | PRW-01 | unit | `npm run test:unit -- url-parser` | ❌ W0 | ⬜ pending |
| path-detection | 01 | 3 | CFG-01, CFG-02 | unit | `npm run test:unit -- path-resolver` | ❌ W0 | ⬜ pending |
| subprocess-runner | 01 | 3 | DB-02, CFG-02 | unit | `npm run test:unit -- subprocess` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/sqlite-spike.js` — electron-rebuild validation script (runs outside VS Code, verifies ABI match)
- [ ] `src/test/unit/storage.test.ts` — StorageAdapter interface stubs
- [ ] `src/test/unit/sqlite.test.ts` — SQLiteStore init, WAL mode, integrity check stubs
- [ ] `src/test/unit/url-parser.test.ts` — GitHub PR URL parsing stubs
- [ ] `src/test/unit/path-resolver.test.ts` — PATH resolution priority order stubs
- [ ] `src/test/unit/subprocess.test.ts` — SubprocessRunner spawn, streaming, cancellation stubs
- [ ] `src/test/integration/pr-provider.test.ts` — TreeDataProvider all-states stubs
- [ ] `vitest.config.ts` — unit test config
- [ ] `package.json` — `test:unit` and `test` scripts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PR flat list with state badges renders in sidebar | PRW-01 | VS Code UI, not automatable | Launch extension, open GitHub repo, verify open/closed/merged PRs appear with green/purple/red badges |
| Diff editor opens on PR selection | PRW-02 | VS Code diff editor API | Select a PR in sidebar, verify diff opens with correct files |
| Output Channel shows streaming claude output | DB-01 (infra) | VS Code UI | Run "Generate Review" command, verify Output Channel shows tokens streaming in real time |
| Setup notification shown when claude not in PATH | CFG-02 | VS Code notification API | Remove claude from PATH, reload extension, verify notification with settings link appears |
| SQLite error notification on ABI mismatch | DB-02 | Requires actual ABI mismatch | Temporarily use wrong Node binary, verify error message is actionable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
