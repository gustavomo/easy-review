# Phase 2: AI Review Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md  --  this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 02-ai-review-generation
**Areas discussed:** Review trigger & context, Streaming progress display, Webview panel layout, Project analysis scope & trigger

---

## Review trigger & context

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click on PR item (Recommended) | Context menu on PR tree item  --  consistent with VS Code conventions | ✓ |
| Command palette only | User runs 'Easy Review: Generate Review' | |
| Both right-click and command palette | Context menu AND command palette | |

**User's choice:** Right-click on PR item only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Diff + PR title/description + file list | Diff + title + description + file list | |
| Diff only | Raw code changes only | |
| Diff + full PR metadata + commit messages | Diff, title, description, author, commit messages | ✓ |

**User's choice:** Diff + full PR metadata + commit messages

---

| Option | Description | Selected |
|--------|-------------|----------|
| No  --  fixed internal prompt template (Recommended) | One well-crafted template, no editing | ✓ |
| Optional prompt editor before generation | Show assembled prompt, user can tweak | |
| Configurable template in VS Code settings | User sets template in settings.json | |

**User's choice:** Fixed internal prompt template

---

| Option | Description | Selected |
|--------|-------------|----------|
| Uses last-selected PR in sidebar (Recommended) | Reads active selection from EasyReviewPRsProvider | |
| Always requires right-click  --  no palette trigger | Only right-click works. No ambiguity. | ✓ |

**User's choice:** Right-click only  --  no palette trigger

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch via GitHub REST API using stored PR URL (Recommended) | Use Octokit to fetch diff via GitHub API | ✓ |
| Re-use upstream PullRequestModel to get diff | Deeper upstream coupling | |
| Fetch raw diff URL from GitHub (patch format) | Simple HTTP call, no Octokit | |

**User's choice:** Fetch via GitHub REST API using Octokit

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  always prepend project analysis when it exists (Recommended) | Auto-inject when available | ✓ |
| User can toggle  --  include or skip project context per review | Checkbox/setting per review | |

**User's choice:** Always auto-inject when available

---

| Option | Description | Selected |
|--------|-------------|----------|
| One at a time  --  block and notify (Recommended) | Show notification if review in progress | |
| Queue it  --  run after current finishes | Second review waits in queue | ✓ |
| Allow concurrent reviews | Multiple parallel CLI processes | |

**User's choice:** Queue  --  run after current finishes

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  show count of existing reviews and confirm (Recommended) | "This PR already has N reviews. Generate a new one?" | ✓ |
| No  --  just generate, existing reviews preserved anyway | No prompt | |

**User's choice:** Yes  --  show confirmation with count

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  cancel button in webview during generation (Recommended) | Uses existing CancellationToken in SubprocessRunner | ✓ |
| No cancel  --  user waits or closes panel | Simpler, no cancel UI | |

**User's choice:** Yes  --  cancel button in webview

---

| Option | Description | Selected |
|--------|-------------|----------|
| Claude CLI only for Phase 2 (Recommended) | codex is v2 scope | |
| Both claude and codex  --  user picks in settings | Add setting for which CLI to use | ✓ |

**User's choice:** Both claude and codex in Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same SubprocessRunner, separate prompt adapter per CLI (Recommended) | Clean separation of CLI-specific logic | ✓ |
| Separate codex runner class | Duplicates streaming logic | |

**User's choice:** Same SubprocessRunner + per-CLI adapters

---

| Option | Description | Selected |
|--------|-------------|----------|
| Separate VS Code setting easyReview.codexPath (Recommended) | Mirrors existing claudePath pattern | ✓ |
| Single setting easyReview.cliPath with model dropdown | One path setting | |

**User's choice:** Separate `easyReview.codexPath` setting

---

| Option | Description | Selected |
|--------|-------------|----------|
| One shared prompt template, adapted for each CLI syntax (Recommended) | Same review format contract | ✓ |
| Independent prompt templates per CLI | Fully separate prompts | |

**User's choice:** One shared template, adapted per CLI

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  show which model was used in the review header (Recommended) | 'Generated with: claude' in header | ✓ |
| No  --  not visible in UI | Internal only | |

**User's choice:** Yes  --  model shown in review header

---

## Streaming progress display

| Option | Description | Selected |
|--------|-------------|----------|
| Live streaming text  --  output appears as Claude writes it (Recommended) | Real-time streaming into webview | ✓ |
| Progress bar with status labels | Indeterminate spinner + status messages | |
| Spinner + live log lines | Spinner + scrolling output log | |

**User's choice:** Live streaming text

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace streaming text with final structured 6-section view (Recommended) | Stream → structured transition on complete | ✓ |
| Keep streamed text visible, add formatted sections below | Both views coexist | |
| Stream directly into section slots as they complete | Complex live section detection | |

**User's choice:** Replace streaming text with final structured view

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show error state in webview with error message + retry button (Recommended) | Webview transitions to error panel | ✓ |
| Show VS Code notification only, webview stays empty | Error via showErrorMessage only | |

**User's choice:** Error state in webview with retry button

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  show elapsed seconds in webview header (Recommended) | "Generating... 45s" counter | ✓ |
| No  --  streaming text is enough | No separate timer | |

**User's choice:** Yes  --  elapsed time in webview header

---

| Option | Description | Selected |
|--------|-------------|----------|
| PostMessage on every text chunk from SubprocessRunner (Recommended) | Each chunk triggers postMessage | |
| Buffer chunks, send every 200ms to reduce message count | Batched delivery | ✓ |

**User's choice:** Buffer every 200ms

---

| Option | Description | Selected |
|--------|-------------|----------|
| idle → generating (streaming) → complete (review) \| error (Recommended) | Three-state machine | ✓ |
| loading → streaming → parsing → complete \| error \| cancelled | More granular states | |

**User's choice:** Three states: idle → generating → complete | error

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  auto-scroll to bottom as text streams in (Recommended) | Standard terminal-like UX | ✓ |
| No  --  user can scroll freely | User controls position | |

**User's choice:** Yes  --  auto-scroll

---

| Option | Description | Selected |
|--------|-------------|----------|
| Partial output discarded, webview returns to idle (Recommended) | Clean cancellation | ✓ |
| Partial output preserved, shown with 'Cancelled' banner | User can read what was generated | |

**User's choice:** Discard partial output, return to idle

---

| Option | Description | Selected |
|--------|-------------|----------|
| Webview only  --  no Output Channel during generation (Recommended) | Clean Phase 1 → Phase 2 handoff | ✓ |
| Both  --  webview + Output Channel | Duplicate stream to both sinks | |

**User's choice:** Webview only

---

## Webview panel layout

| Option | Description | Selected |
|--------|-------------|----------|
| One scrollable doc with collapsible sections (Recommended) | All 6 sections, collapsible | ✓ |
| Tabs  --  one tab per section | 6 tabs at top | |
| Flat document  --  no tabs, no collapse | Simple sequential sections | |

**User's choice:** Scrollable doc with collapsible sections

---

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by severity with colored labels (Recommended) | Three groups: critical/warning/suggestion | ✓ |
| All findings in flat list with colored severity badges | No grouping, sequential list | |
| Expandable tree: severity → individual finding | Click to expand severity group | |

**User's choice:** Grouped by severity with colored labels

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in webview header to switch between versions (Recommended) | Select dropdown with version list | ✓ |
| History list in sidebar below PR items | Collapsible tree node per PR | |
| Separate 'History' tab in webview panel | Extra tab for all versions | |

**User's choice:** Dropdown in webview header

---

| Option | Description | Selected |
|--------|-------------|----------|
| Raw Mermaid code block in Phase 2 (Recommended) | Visual rendering deferred to POL-01 | ✓ |
| Render Mermaid diagrams visually in Phase 2 | Add mermaid.js to webview bundle | |

**User's choice:** Raw code block in Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Opens in second editor column (Recommended) | vscode.ViewColumn.Two | ✓ |
| Opens in new tab in current editor group | vscode.ViewColumn.Active | |
| Opens as secondary side panel | Secondary sidebar view | |

**User's choice:** ViewColumn.Two

---

| Option | Description | Selected |
|--------|-------------|----------|
| PR title + model used + timestamp + history dropdown (Recommended) | Full context header | ✓ |
| Just PR title and settings gear icon | Minimal header | |

**User's choice:** PR title + model + timestamp + history dropdown

---

| Option | Description | Selected |
|--------|-------------|----------|
| Both  --  use VS Code CSS custom properties (Recommended) | var(--vscode-editor-background) etc. | ✓ |
| Dark only for Phase 2 | Hardcoded dark colors | |

**User's choice:** Both light and dark via CSS custom properties

---

| Option | Description | Selected |
|--------|-------------|----------|
| Side-by-side diff blocks (before \| after) per change (Recommended) | Classic diff with red/green highlighting | ✓ |
| Before and after as separate stacked code blocks | Simpler but less visual | |
| Inline unified diff format (like git diff) | +/- lines, compact | |

**User's choice:** Side-by-side diff blocks

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes  --  restore last viewed review on panel reopen (Recommended) | Load from SQLite on panel creation | ✓ |
| No  --  panel starts empty | Blank panel each VS Code session | |

**User's choice:** Yes  --  persist last viewed review

---

| Option | Description | Selected |
|--------|-------------|----------|
| Singleton panel  --  reused for all PRs (Recommended) | One ReviewPanel instance | ✓ |
| Per-PR panels  --  separate panel per PR | Multiple simultaneous panels | |

**User's choice:** Singleton panel

---

## Project analysis scope & trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-prompted on first review if no analysis exists (Recommended) | Prompt on first review trigger | |
| Manual command only  --  user runs 'Easy Review: Analyze Project' | Explicit command palette | ✓ |
| Runs automatically on extension activation | Silent background analysis | |

**User's choice:** Manual command only

---

| Option | Description | Selected |
|--------|-------------|----------|
| README + top-level src structure + package.json + recent git log (Recommended) | Practical set that fits in prompt | ✓ |
| Let Claude pick files via tool use | Non-deterministic, requires tool-use mode | |
| User-configurable file list in settings | Power user, requires setup | |

**User's choice:** README + src structure + package.json + git log (last 20 commits)

---

| Option | Description | Selected |
|--------|-------------|----------|
| PROJ-02 is a separate command  --  fetches PR titles/descriptions via GitHub API | 'Easy Review: Analyze PR History' command | ✓ |
| PROJ-02 is part of PROJ-01  --  one unified analysis command | Single command collects both | |
| PROJ-02 deferred to later phase | Phase 2 only does PROJ-01 | |

**User's choice:** Separate command for PROJ-02

---

| Option | Description | Selected |
|--------|-------------|----------|
| No expiry  --  user re-runs manually (Recommended) | On-demand refresh | ✓ |
| Prompt to re-run if older than 30 days | Stale check on each review | |
| Re-run on every review | Adds 30-90s per review | |

**User's choice:** No expiry in Phase 2

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single row in project_analyses table: collected_at, context_text (Recommended) | One blob of concatenated content | ✓ |
| Multiple rows per source file | Granular but complex to reassemble | |

**User's choice:** Single row, raw context_text blob

---

| Option | Description | Selected |
|--------|-------------|----------|
| Overwrite  --  latest analysis replaces previous (Recommended) | Not versioned | ✓ |
| Append with timestamp  --  all versions kept | Multiple versions stored | |

**User's choice:** Overwrite on re-run

---

| Option | Description | Selected |
|--------|-------------|----------|
| VS Code progress notification with cancellation (Recommended) | withProgress in notification area | ✓ |
| Same streaming webview as reviews | Open ReviewPanel in streaming mode | |
| Silent  --  notification on completion only | No progress UI | |

**User's choice:** VS Code progress notification

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show summary notification: "Project analysis complete. Collected: ..." (Recommended) | Toast with collection summary | ✓ |
| Open webview with collected context displayed | ReviewPanel shows raw context | |
| No confirmation  --  silent save to SQLite | Minimal | |

**User's choice:** Summary notification on completion
