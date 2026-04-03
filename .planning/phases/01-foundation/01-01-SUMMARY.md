---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [esbuild, vscode-extension, typescript, better-sqlite3, fork, build-pipeline]

# Dependency graph
requires: []
provides:
  - Upstream fork merged (microsoft/vscode-pull-request-github at aa7eb418)
  - Two-target build pipeline: esbuild for extension host (CJS), vite config for webview
  - src/easy-review/activation.ts hooks wired into extension lifecycle
  - easy-review-diff.md manifest tracking upstream file touches
  - better-sqlite3 dependency installed, @electron/rebuild dev dependency added
affects:
  - 01-foundation (all subsequent plans depend on this build compiling)
  - 02-review-engine
  - 03-ui

# Tech tracking
tech-stack:
  added:
    - better-sqlite3 ^12.8.0 (dependency)
    - "@electron/rebuild ^4.0.3 (devDependency)"
    - "@types/better-sqlite3 (devDependency)"
    - esbuild (via existing node_modules, no new install needed)
  patterns:
    - "All Easy Review code in src/easy-review/ — never modify upstream core"
    - "esbuild.extension.js for extension host bundling (CJS, node22 target)"
    - "easy-review-diff.md updated on every upstream file touch"
    - ".gql and .svg files loaded as text by esbuild"

key-files:
  created:
    - esbuild.extension.js
    - vite.webview.config.ts
    - src/easy-review/activation.ts
    - src/shared/types.ts
    - easy-review-diff.md
  modified:
    - package.json
    - package-lock.json
    - src/extension.ts
    - src/@types/vscode.proposed.chatParticipantPrivate.d.ts
    - src/@types/vscode.proposed.chatSessionsProvider.d.ts

key-decisions:
  - "Used npm install --legacy-peer-deps for dependency management (upstream peer dep conflicts with vitest)"
  - "Added .gql and .svg loaders to esbuild config (Rule 3 auto-fix — blocking build errors)"
  - "Did NOT change tsconfig.json module to commonjs — esbuild handles CJS output; changing tsconfig would break upstream webpack build"
  - "Merged upstream with --allow-unrelated-histories since easy-review repo started as empty repo"
  - "easyReview.claudePath added to existing contributes.configuration.properties (not a new contributes.configuration block)"

patterns-established:
  - "Pattern: easy-review activation hook — all feature registration in src/easy-review/activation.ts, called from src/extension.ts"
  - "Pattern: esbuild bundle — entrypoint src/extension.ts, output dist/extension.js, CommonJS, externalizes vscode+better-sqlite3"
  - "Pattern: upstream diff tracking — easy-review-diff.md updated for every upstream file touched"

requirements-completed: [PRW-01, PRW-02]

# Metrics
duration: 25min
completed: 2026-04-03
---

# Phase 01 Plan 01: Fork Setup and Build Pipeline Summary

**microsoft/vscode-pull-request-github fork merged with esbuild extension host build producing dist/extension.js and easy-review activation hook wired into extension lifecycle**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-03T18:10:00Z
- **Completed:** 2026-04-03T18:15:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Upstream fork merged into easy-review repo (microsoft/vscode-pull-request-github at aa7eb418) with git history intact
- esbuild.extension.js build script produces dist/extension.js (4.9MB CJS bundle) with exit code 0
- src/easy-review/activation.ts created with activateEasyReview/deactivateEasyReview hooks wired into src/extension.ts
- better-sqlite3 ^12.8.0, @electron/rebuild ^4.0.3, @types/better-sqlite3 added to package.json
- easyReview.claudePath configuration setting added to contributes
- easy-review-diff.md upstream manifest created, tracking src/extension.ts and package.json as modified

## Task Commits

Each task was committed atomically:

1. **Task 1: Fork setup and dependency updates** - `88d76262` (feat)
2. **Task 2: Build pipeline and easy-review activation hook** - `a2e56840` (feat)

**Plan metadata:** (added in final docs commit)

## Files Created/Modified

- `esbuild.extension.js` - Extension host build script: CJS output, externalizes vscode+better-sqlite3, .gql/.svg text loaders
- `vite.webview.config.ts` - Webview build config: React plugin, outputs dist/webview/, @shared alias
- `src/easy-review/activation.ts` - Easy Review activation/deactivation hooks (stub, to be filled in subsequent plans)
- `src/shared/types.ts` - Shared types placeholder between extension host and webview
- `easy-review-diff.md` - Upstream diff manifest listing every upstream file touched
- `package.json` - name=easy-review, added better-sqlite3/electron-rebuild deps, build scripts, easyReview.claudePath config
- `src/extension.ts` - Added activateEasyReview(context) and deactivateEasyReview() calls

## Decisions Made

- Used `--allow-unrelated-histories` for upstream merge — easy-review repo started as empty (no upstream fork on GitHub)
- Did NOT change tsconfig.json `module` to `commonjs` — upstream webpack build depends on `esnext`, esbuild handles CJS output
- Added `.gql` and `.svg` loaders to esbuild (auto-fix) — upstream codebase imports GQL files as text
- Used `--legacy-peer-deps` for npm install — upstream has peer dep conflicts with newer test tools

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gql and .svg loaders to esbuild config**
- **Found during:** Task 2 (Build pipeline)
- **Issue:** `npm run build:extension` failed with "No loader is configured for .gql files" — upstream codebase imports Apollo GQL files directly
- **Fix:** Added `loader: { '.gql': 'text', '.svg': 'text' }` to esbuild.build() config
- **Files modified:** esbuild.extension.js
- **Verification:** `npm run build:extension` exits 0, produces dist/extension.js (4.9MB)
- **Committed in:** a2e56840 (Task 2 commit)

**2. [Rule 3 - Blocking] Used --allow-unrelated-histories for upstream merge**
- **Found during:** Task 1 (Fork setup)
- **Issue:** easy-review repo had independent git history (no GitHub fork relationship with upstream)
- **Fix:** Used `git merge upstream/main --allow-unrelated-histories` and resolved README.md conflict
- **Files modified:** README.md (conflict resolved with combined content)
- **Verification:** All upstream files present, git history intact
- **Committed in:** 40b15cc7 (upstream merge commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for the build to work. No scope creep.

## Issues Encountered

- `npm install` triggered `update-dts` postinstall script, which regenerated two proposed API type files (`vscode.proposed.chatParticipantPrivate.d.ts`, `vscode.proposed.chatSessionsProvider.d.ts`) — these were committed as part of Task 1 since they reflect the updated @types/vscode version
- `node -e "require('./dist/extension.js')"` always fails (cannot find module 'vscode') — this is expected behavior; vscode is externalized and only available in VS Code extension host runtime

## Known Stubs

- `src/easy-review/activation.ts` — `activateEasyReview` and `deactivateEasyReview` function bodies are empty stubs. This is intentional: subsequent plans (01-02 through 01-06) will add feature registration. The stub satisfies the build dependency chain.
- `src/shared/types.ts` — Empty placeholder. Types will be added as features are implemented in subsequent plans.
- `vite.webview.config.ts` — References `src/webview/index.tsx` as entry point, which does not yet exist. `npm run build:webview` will fail until the webview is created in a later plan.

## Next Phase Readiness

- Build pipeline is operational: `npm run build:extension` exits 0 and produces dist/extension.js
- All subsequent plans can add code to src/easy-review/ and have it compile via esbuild
- better-sqlite3 dependency is declared; native rebuild script (`npm run rebuild:sqlite`) is ready but not yet executed
- easy-review-diff.md manifest started — must be updated for every upstream file touch

---
*Phase: 01-foundation*
*Completed: 2026-04-03*
