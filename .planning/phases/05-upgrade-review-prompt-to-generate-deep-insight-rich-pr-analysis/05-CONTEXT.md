# Phase 5: Upgrade Review Prompt to Generate Deep, Insight-Rich PR Analysis - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewrite `PromptBuilder.ts` to produce AI reviews at the quality level of the Privanote SYNTHESIS_INSTRUCTION: deep Executive Summaries explaining WHY/WHAT/OUTCOME (not file lists), per-file annotated before/after diffs reconstructed from the unified diff, structured review findings from real GitHub comments, and elaborate Mermaid diagrams specific to the PR's actual changes.

This requires:
1. Upgrading the prompt instructions (the biggest leverage point)
2. Fetching review comments from GitHub (currently not fetched at all)
3. Fetching commit messages from GitHub (currently hardcoded empty)
4. Renaming two output sections and updating ReviewParser to match
5. Passing the PR's GitHub URL so the model can generate clickable file links

Out of scope: system/user prompt split, Privanote note posting, MCP integration, section-omission logic.

</domain>

<decisions>
## Implementation Decisions

### Prompt Instructions

- **D-01:** Port the Privanote SYNTHESIS_INSTRUCTION verbatim, adapted for our data shape. Replace ADK/pipeline references with our field names. Keep all rules, bad/good examples, per-section guidance, annotation requirements, and Mermaid specificity rules intact.
- **D-02:** The instruction lives as an inline `const SYNTHESIS_INSTRUCTION` string at the top of `PromptBuilder.ts`. No separate file.
- **D-03:** Single combined prompt — no system/user split. Everything in one message sent via stdin. Preserves D-07 (same path for Claude and Codex CLIs).
- **D-04:** Include the PR's full GitHub URL in the prompt data so the model can construct per-file links of the form `https://github.com/{owner}/{repo}/pull/{N}/files`. The owner/repo/prNumber are already available in `ReviewPanel.ts`.

### Data Enrichment — Review Comments

- **D-05:** Add `fetchReviewComments()` to a new or existing GitHub utility. Use:
  - `octokit.rest.pulls.listReviewComments` (line-level comments)
  - `octokit.rest.pulls.listReviews` (PR-level review bodies)
- **D-06:** Full detail per comment: reviewer login, file path, line number (if applicable), and comment body. Format as a flat list in the prompt under a `## Review Comments` data section.
- **D-07:** Pass review comments as a new `reviewComments` field on `BuildPromptOptions`. When empty (`[]`), the prompt section renders as "No review comments on this PR."

### Data Enrichment — Commit Messages

- **D-08:** Add `fetchPRCommits()` using `octokit.rest.pulls.listCommits`. Extract only the commit message (subject line) for each commit.
- **D-09:** Wire commit messages into `ReviewPanel.ts` — replace the hardcoded `commitMessages: []` with the fetched list. Pass through `BuildPromptOptions.pr.commitMessages` (field already exists in the interface).

### Section Names & ReviewParser

- **D-10:** Rename two output section headings in the prompt instructions:
  - `## Findings` → `## Code Review Findings`
  - `## Mermaid Diagram` → `## Visual Overview`
- **D-11:** Update `ReviewParser.ts` `buildSection()` to match `normalizedTitle.includes('code review finding')` in addition to the existing `'finding'` check, so the findings parser fires correctly on the renamed heading.
- **D-12:** The 6-section contract (D-07) is preserved — always output all 6 sections. No section omission. This keeps the ReviewDocument rendering predictable.

### Claude's Discretion

- Exact formatting of the review comments block in the prompt (flat list vs grouped by type)
- Whether to batch the two new GitHub API calls in parallel or sequentially in `ReviewPanel.ts`
- Whether `fetchReviewComments` and `fetchPRCommits` go in `DiffFetcher.ts` (co-locate with `fetchPRDiff`) or a new `ReviewDataFetcher.ts`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core files being modified
- `src/easy-review/cli/PromptBuilder.ts` — Current prompt structure; defines `BuildPromptOptions` interface and `buildPrompt()` function
- `src/easy-review/cli/ReviewParser.ts` — Section heading matching logic; `buildSection()` and `parseFindingsSection()` must be updated
- `src/easy-review/panel/ReviewPanel.ts` — Caller of `buildPrompt()` and `fetchPRDiff()`; wires octokit, constructs `BuildPromptOptions`
- `src/easy-review/github/DiffFetcher.ts` — Pattern for fetching GitHub data with octokit; new fetcher functions should follow this pattern

### Reference prompt (user-provided, highest priority)
- The Privanote SYNTHESIS_INSTRUCTION was provided by the user in the session conversation. It is the source document for D-01. The planner must use it as the base for the new prompt. Key rules to preserve:
  - Executive Summary: 3–5 sentences answering What/Approach/Outcome; explicit BAD vs GOOD examples
  - Categorized Changes: per-file one-liners grouped by Features/Fixes/Refactors/Tests/Config
  - Key Code Changes: for every file with logic changes — before/after snippets reconstructed from `+`/`-` lines (no raw diff format), with detailed inline comments citing PR description motivation
  - Code Review Findings: grouped by critical/warning/suggestion; DO NOT invent findings
  - Impact Analysis: risk level (low/medium/high) + justification, affected areas, side effects
  - Visual Overview: elaborate PR-specific Mermaid (sequenceDiagram, graph TD, stateDiagram-v2); label nodes with real names from the code; skip only for single-line typo/config changes

### Supporting types
- `src/shared/types.ts` — `ReviewSection`, `Finding` types that ReviewParser returns
- `src/easy-review/storage/types.ts` — `StoredProjectAnalysis` shape passed as project context

No external ADRs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchPRDiff(octokit, owner, repo, prNumber)` in `DiffFetcher.ts` — pattern for new `fetchReviewComments()` and `fetchPRCommits()` functions; same signature shape
- `BuildPromptOptions` interface already has a `commitMessages: string[]` field — just needs to be populated instead of `[]`
- `ReviewParser.parseReview()` already splits by `## H2` headings case-insensitively — rename tolerance already there via `includes('finding')`

### Established Patterns
- All GitHub data fetching goes through `octokit` passed from `ReviewPanel.ts` — new fetchers follow the same pattern
- `parts.join('\n\n---\n\n')` is the prompt assembly pattern — new data sections (review comments) plug in as additional `parts.push(...)` entries
- `buildSection()` in ReviewParser uses `normalizedTitle.includes('finding')` — extend, don't replace, to stay backwards compatible with old stored reviews

### Integration Points
- `ReviewPanel.ts` lines ~194–210: the `fetchPRDiff → buildPrompt → runReview` pipeline; new fetches plug in before `buildPrompt()` call
- `BuildPromptOptions.pr.prNumber` + `pr.repoId` (format: `"owner/repo"`) — owner/repo are already split in ReviewPanel at line ~193; pass PR URL via a new `prUrl` field on `BuildPromptOptions`

</code_context>

<specifics>
## Specific Ideas

- User provided a complete worked example of the desired output quality (the Privanote PR analysis example with `TransientFault` / `ConsumerCircuitBreakerService` fixes). This is the quality bar.
- The Privanote SYNTHESIS_INSTRUCTION was provided verbatim in the session. Planner should use it as the base text for D-01 — not reconstruct it from memory.
- `ReviewPanel.ts` already splits `repoId` into `[owner, repo]` at line ~193 — the PR URL is `https://github.com/${owner}/${repo}/pull/${pr.prNumber}` and should be passed to buildPrompt as a new field.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis*
*Context gathered: 2026-04-03*
