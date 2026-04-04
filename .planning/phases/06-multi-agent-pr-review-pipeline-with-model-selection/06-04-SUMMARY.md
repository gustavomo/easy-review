---
phase: 06-multi-agent-pr-review-pipeline-with-model-selection
plan: "04"
subsystem: cli-parser + settings
tags: [tdd, reviewer, settings, model-selection]
dependency_graph:
  requires: ["06-01", "06-02"]
  provides: ["ReviewParser bug keyword detection", "modelSettings resolveAgentModel/migrateActiveModel", "package.json defaultModel+agentModels settings"]
  affects: ["06-05", "06-06", "06-07", "06-08"]
tech_stack:
  added: []
  patterns: ["pure-function settings helpers", "surgical buildSection edit"]
key_files:
  created:
    - src/easy-review/cli/ReviewParser.test.ts
    - src/easy-review/settings/modelSettings.ts
    - src/easy-review/settings/modelSettings.test.ts
  modified:
    - src/easy-review/cli/ReviewParser.ts
    - package.json
decisions:
  - "vi.mock pattern not used for modelSettings.test.ts — module created directly (GREEN phase) since plan creates the implementation"
  - "buildSection surgical edit: only condition extended, no other changes to ReviewParser"
  - "readModelConfig uses typed defaultValue cast to satisfy TS strict null checks"
metrics:
  duration: "2.5 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  files_changed: 5
---

# Phase 06 Plan 04: ReviewParser + modelSettings + package.json Settings Summary

**One-liner:** ReviewParser `buildSection()` extended with `bug` keyword detection; pure `resolveAgentModel`/`migrateActiveModel` helpers added; VS Code settings contributed for `easyReview.defaultModel` and `easyReview.agentModels`.

## What Was Built

### Task 1: ReviewParser 7-section update + modelSettings.ts implementation (TDD)

**ReviewParser.ts — surgical edit to `buildSection()`:**

The findings detection condition was extended to also match the `bug` keyword, enabling "Bug & Risk Analysis" sections from the Phase 6 7-agent pipeline to receive findings parsing (severity extraction into `Finding[]`):

```typescript
const isFindingsSection =
  normalizedTitle === 'findings' ||
  normalizedTitle.includes('finding') ||
  normalizedTitle.includes('bug');
```

**modelSettings.ts — new file:**

Three pure functions created:
- `resolveAgentModel(opts)` — returns per-agent override from `agentModels` if present, otherwise `defaultModel`
- `migrateActiveModel(opts)` — D-21 migration: `defaultModel` wins if set, else falls back to `activeModel`, else returns `'claude'`
- `readModelConfig(config)` — reads VS Code workspace config using the migration helper

**Test files created:**
- `ReviewParser.test.ts` — 14 tests covering 7-section Phase 6 contract including the new `bug` keyword trigger
- `modelSettings.test.ts` — 6 tests for `resolveAgentModel` and `migrateActiveModel` contracts

### Task 2: package.json settings

Added to `contributes.configuration.properties` under the Easy Review section:
- `easyReview.defaultModel` — enum `["claude", "codex", "ollama"]`, default `"claude"`
- `easyReview.agentModels` — object with `additionalProperties` enum for per-agent overrides
- Updated `easyReview.activeModel` description with D-21 deprecation notice: "Deprecated: use easyReview.defaultModel instead."

## Verification

- `npm run test:unit`: ReviewParser and modelSettings test suites: 22/22 pass
- `node -e "JSON.parse(...)"` on package.json: exits 0 (valid JSON)
- `buildSection()` contains `normalizedTitle.includes('bug')`: confirmed
- `modelSettings.ts` exports `resolveAgentModel`, `migrateActiveModel`, `readModelConfig`: confirmed

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Note:** The TDD RED phase was slightly compressed since Plan 06-01 had already created the test scaffolds for other modules. ReviewParser.test.ts and modelSettings.test.ts were created as part of this plan's TDD flow (RED then GREEN).

## Known Stubs

None — all functions are fully implemented. `readModelConfig` is wired to the VS Code `workspace.getConfiguration` interface (D-21 migration) and production-ready.
