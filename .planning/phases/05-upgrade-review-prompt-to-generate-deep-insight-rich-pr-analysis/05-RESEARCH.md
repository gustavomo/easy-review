# Phase 5: Upgrade Review Prompt to Generate Deep, Insight-Rich PR Analysis - Research

**Researched:** 2026-04-03
**Domain:** TypeScript prompt engineering + GitHub REST API enrichment (Octokit)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Port the Privanote SYNTHESIS_INSTRUCTION verbatim, adapted for our data shape. Replace ADK/pipeline references with our field names. Keep all rules, bad/good examples, per-section guidance, annotation requirements, and Mermaid specificity rules intact.
- **D-02:** The instruction lives as an inline `const SYNTHESIS_INSTRUCTION` string at the top of `PromptBuilder.ts`. No separate file.
- **D-03:** Single combined prompt — no system/user split. Everything in one message sent via stdin. Preserves D-07 (same path for Claude and Codex CLIs).
- **D-04:** Include the PR's full GitHub URL in the prompt data so the model can construct per-file links of the form `https://github.com/{owner}/{repo}/pull/{N}/files`. The owner/repo/prNumber are already available in `ReviewPanel.ts`.
- **D-05:** Add `fetchReviewComments()` to a new or existing GitHub utility. Use:
  - `octokit.rest.pulls.listReviewComments` (line-level comments)
  - `octokit.rest.pulls.listReviews` (PR-level review bodies)
- **D-06:** Full detail per comment: reviewer login, file path, line number (if applicable), and comment body. Format as a flat list in the prompt under a `## Review Comments` data section.
- **D-07:** Pass review comments as a new `reviewComments` field on `BuildPromptOptions`. When empty (`[]`), the prompt section renders as "No review comments on this PR."
- **D-08:** Add `fetchPRCommits()` using `octokit.rest.pulls.listCommits`. Extract only the commit message (subject line) for each commit.
- **D-09:** Wire commit messages into `ReviewPanel.ts` — replace the hardcoded `commitMessages: []` with the fetched list. Pass through `BuildPromptOptions.pr.commitMessages` (field already exists in the interface).
- **D-10:** Rename two output section headings in the prompt instructions:
  - `## Findings` → `## Code Review Findings`
  - `## Mermaid Diagram` → `## Visual Overview`
- **D-11:** Update `ReviewParser.ts` `buildSection()` to match `normalizedTitle.includes('code review finding')` in addition to the existing `'finding'` check, so the findings parser fires correctly on the renamed heading.
- **D-12:** The 6-section contract (D-07) is preserved — always output all 6 sections. No section omission. This keeps the ReviewDocument rendering predictable.

### Claude's Discretion

- Exact formatting of the review comments block in the prompt (flat list vs grouped by type)
- Whether to batch the two new GitHub API calls in parallel or sequentially in `ReviewPanel.ts`
- Whether `fetchReviewComments` and `fetchPRCommits` go in `DiffFetcher.ts` (co-locate with `fetchPRDiff`) or a new `ReviewDataFetcher.ts`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

Out of scope (explicitly): system/user prompt split, Privanote note posting, MCP integration, section-omission logic.
</user_constraints>

---

## Summary

Phase 5 is a focused prompt-engineering and data-enrichment phase. The goal is to replace the thin 8-line `## Instructions` block in `PromptBuilder.ts` with a production-quality SYNTHESIS_INSTRUCTION derived from Privanote, and simultaneously feed the model two new data sources it currently lacks: GitHub review comments and commit messages.

The codebase is well-structured for this change. The `BuildPromptOptions` interface already carries a `commitMessages` field (just never populated); `ReviewPanel.ts` already has `owner`/`repo` split at line 193; and the `DiffFetcher.ts` pattern is a clean 12-line template for new fetchers. All three Octokit methods needed (`listReviewComments`, `listReviews`, `listCommits`) are confirmed available on the installed `@octokit/rest` version.

The two renamed section headings (`## Code Review Findings`, `## Visual Overview`) require a backward-compatible patch to `ReviewParser.ts`: extend the `includes('finding')` guard, never replace it, so old stored reviews still parse correctly.

**Primary recommendation:** Implement in 4 sequential tasks: (1) add the two new GitHub fetcher functions, (2) wire them into `ReviewPanel.ts` with `Promise.all`, (3) add `reviewComments`/`prUrl` fields to `BuildPromptOptions` and rewrite `PromptBuilder.ts` with the full SYNTHESIS_INSTRUCTION, (4) patch `ReviewParser.ts` for the renamed headings and update all affected tests.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on This Phase |
|-----------|---------------------|
| TypeScript strict mode, CommonJS module | `PromptBuilder.ts` stays `.ts`, no ESM syntax |
| No async SQLite drivers | Not relevant (no storage changes this phase) |
| No webpack | Not relevant (no build changes) |
| No React in extension host | Not relevant (only extension host files touched) |
| `child_process.spawn` with streaming | Not relevant (ReviewRunner unchanged) |
| `better-sqlite3` sync API | Not relevant (no new DB queries) |
| `@octokit/rest` via upstream auth | New fetcher functions inherit octokit from `ReviewPanel.ts` — same pattern as `fetchPRDiff` |
| VS Code 1.85+ baseline | Not relevant (no API surface changes) |

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version in Use | Purpose | Why |
|---------|----------------|---------|-----|
| `@octokit/rest` | upstream version | GitHub REST API client | Already wired in `ReviewPanel.ts` via `hub.octokit.api`; `listReviewComments`, `listReviews`, `listCommits` all confirmed present at runtime |
| TypeScript | ~5.4.x | Language | Required by project |
| `vitest` | installed | Unit test runner | Existing test suite in `src/test/unit/` |

### No New Dependencies Required

This phase adds zero new packages. All capabilities needed are already available:
- `octokit.rest.pulls.listReviewComments` — confirmed `typeof === 'function'` at runtime
- `octokit.rest.pulls.listReviews` — confirmed `typeof === 'function'` at runtime
- `octokit.rest.pulls.listCommits` — confirmed `typeof === 'function'` at runtime

---

## Architecture Patterns

### Pattern 1: DiffFetcher.ts — Template for New Fetchers

All GitHub data fetching follows a 3-element pattern: typed `octokit` parameter, `(octokit as any)` cast for the actual call (Octokit TS types don't correctly type certain responses), and explicit return type annotation.

```typescript
// Source: src/easy-review/github/DiffFetcher.ts (existing)
export async function fetchPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string> {
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const response = await (octokit as any).rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: 'diff' },
  });
  return response.data as unknown as string;
}
```

New fetchers (`fetchReviewComments`, `fetchPRCommits`) use identical structure.

### Pattern 2: Prompt Assembly — parts.push() + join

```typescript
// Source: src/easy-review/cli/PromptBuilder.ts (existing)
const parts: string[] = [];
parts.push(`## Section\n${content}`);
return parts.join('\n\n---\n\n');
```

New data sections (review comments block) plug in as additional `parts.push(...)` entries before the final instructions section. The SYNTHESIS_INSTRUCTION replaces the current `## Instructions` push entirely.

### Pattern 3: Parallel GitHub Fetches in ReviewPanel.ts

The two new GitHub calls (review comments + commits) are independent of each other and of the diff fetch. Use `Promise.all` for all three:

```typescript
// Pattern — insert at ReviewPanel.ts lines ~194-210 (executeReview method)
const [diff, reviewComments, commitMessages] = await Promise.all([
  fetchPRDiff(octokit, owner, repo, pr.prNumber),
  fetchReviewComments(octokit, owner, repo, pr.prNumber),
  fetchPRCommits(octokit, owner, repo, pr.prNumber),
]);
```

This cuts sequential latency (3 API calls × ~150ms each = ~450ms sequential → ~150ms parallel).

### Pattern 4: BuildPromptOptions Interface Extension

Two new fields need to be added without breaking the existing public interface:

```typescript
// New shape for BuildPromptOptions
export interface BuildPromptOptions {
  pr: PRMetadata;       // unchanged; commitMessages already exists here
  diff: string;         // unchanged
  projectAnalysis: StoredProjectAnalysis | null;  // unchanged
  reviewComments: ReviewComment[];  // NEW — D-07
  prUrl: string;                    // NEW — D-04
}

export interface ReviewComment {
  reviewer: string;     // login
  file?: string;        // path (undefined for PR-level review bodies)
  line?: number;        // line number (undefined for PR-level)
  body: string;
}
```

### Pattern 5: ReviewParser.ts — Extend, Don't Replace

The `buildSection()` function currently uses `normalizedTitle.includes('finding')`. D-11 requires extending this guard to cover both old reviews (stored in SQLite with `## Findings`) and new reviews (output with `## Code Review Findings`).

```typescript
// Pattern — backward-compatible extension (existing behavior preserved)
function buildSection(title: string, content: string): ReviewSection {
  const normalizedTitle = title.toLowerCase();
  // 'finding' covers old '## Findings'; 'code review finding' covers new heading
  if (normalizedTitle.includes('finding')) {
    return { title, content, findings: parseFindingsSection(content) };
  }
  return { title, content };
}
```

Note: `normalizedTitle.includes('finding')` already matches `'code review findings'` (since the string 'finding' is a substring of 'findings'). The D-11 spec is therefore already satisfied by the existing guard — no code change needed in `buildSection()` for the findings parser to fire. The only real change is updating the section heading string in the prompt instructions themselves.

### Pattern 6: SYNTHESIS_INSTRUCTION Structure

Based on the CONTEXT.md canonical reference, the instruction must cover these 6 sections with explicit good/bad examples. The rewrite of `PromptBuilder.ts` replaces the current 5-line instructions block with a comprehensive constant at the top of the file:

```typescript
// Location: top of src/easy-review/cli/PromptBuilder.ts
const SYNTHESIS_INSTRUCTION = `
You are an expert code reviewer...
[full instruction text — ported from Privanote with field name substitutions]
`;
```

Key field name substitutions required (ADK/pipeline → our names):
- `pr_description` / `body` → `opts.pr.description`
- `diff_content` → `opts.diff`
- `review_comments` (ADK field) → our `reviewComments` array
- `commit_messages` → `opts.pr.commitMessages`
- `pr_url` → `opts.prUrl`

### Recommended File Location: Co-locate in DiffFetcher.ts

New fetcher functions should go in `DiffFetcher.ts` alongside `fetchPRDiff`. The rationale: all three functions share the same signature shape `(octokit, owner, repo, prNumber)`, and splitting into a new file adds a module boundary with no architectural benefit at this scale. The file can be renamed `GitHubFetcher.ts` or stay as `DiffFetcher.ts` — either is acceptable (discretion per CONTEXT.md).

### Anti-Patterns to Avoid

- **Replacing the existing `includes('finding')` guard:** Adding a second branch would cause double-matching. The existing guard already covers `'code review findings'` as a substring match.
- **Sequential GitHub API calls:** Three independent calls that take ~150ms each should always run in `Promise.all`. Sequential execution would add ~300ms to every review generation.
- **Storing raw GitHub API objects:** The fetcher functions should return clean domain types (`ReviewComment[]`, `string[]`) rather than raw Octokit response objects. This prevents ReviewPanel.ts from depending on Octokit response shapes.
- **Hardcoding section heading strings in multiple places:** The section headings (`## Code Review Findings`, `## Visual Overview`) must only appear in two places: the SYNTHESIS_INSTRUCTION in PromptBuilder.ts, and the test fixtures in `review-parser.test.ts`. Do not add heading-specific logic to ReviewParser beyond what already exists.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetching PR review comments | Custom HTTP calls | `octokit.rest.pulls.listReviewComments` | Already authenticated, handles pagination, typed response |
| Fetching PR-level review bodies | Custom HTTP calls | `octokit.rest.pulls.listReviews` | Same as above; returns reviewer, state, and body |
| Fetching commit messages | Custom HTTP calls | `octokit.rest.pulls.listCommits` | Returns full commit objects; extract `.commit.message` for subject line |
| Prompt content truncation | Custom string trimmer | Rely on model context window | Claude 3.x / Codex have 200K+ context; typical PR diff + comments will not approach limits |

**Key insight:** Every data source this phase needs is already accessible through the authenticated Octokit instance that ReviewPanel.ts holds. No new auth, no new HTTP client, no new dependencies.

---

## Common Pitfalls

### Pitfall 1: Octokit Pagination on Review Comments
**What goes wrong:** `listReviewComments` defaults to 30 items per page. A PR with more than 30 inline comments silently truncates the list.
**Why it happens:** Octokit REST methods return a single page by default.
**How to avoid:** Use `octokit.paginate()` or pass `per_page: 100` to the endpoint. For most PRs, 100 is sufficient; add a note in the fetcher if pagination is skipped.
**Warning signs:** Comment count in prompt is lower than visible on GitHub.

### Pitfall 2: listReviews Returns "COMMENTED" Reviews with Empty Bodies
**What goes wrong:** `listReviews` returns review objects for every reviewer action, including `APPROVED`/`CHANGES_REQUESTED` events with empty `body` strings. Emitting empty bodies pollutes the review comments section.
**Why it happens:** GitHub creates a review record for every submit, even if the reviewer wrote no summary text.
**How to avoid:** Filter `listReviews` results: only include items where `review.body.trim() !== ''`. The reviewer login and state (`APPROVED`, `CHANGES_REQUESTED`) can still be emitted without a body, or omitted entirely.

### Pitfall 3: `as unknown as string` vs Direct Type Cast
**What goes wrong:** New fetchers may tempt a direct `as T` cast on Octokit response data, which TypeScript may reject or silently widen.
**Why it happens:** Octokit's TypeScript types don't always match the actual runtime shape for certain media-type formats.
**How to avoid:** Follow the established `DiffFetcher.ts` pattern: `(octokit as any).rest.pulls.X(...)` + typed return. `// eslint-disable-next-line rulesdir/no-cast-to-any` comment required per project lint rules.

### Pitfall 4: Test Fixtures Use Old Section Heading Names
**What goes wrong:** `src/test/unit/prompt-builder.test.ts` line 45 checks `expect(result).toContain('## Findings')` and line 47 checks `expect(result).toContain('## Mermaid Diagram')`. These assertions will fail after D-10 renames the headings.
**Why it happens:** Tests were written against the old heading names.
**How to avoid:** Update `prompt-builder.test.ts` to check for `## Code Review Findings` and `## Visual Overview` after rewriting the SYNTHESIS_INSTRUCTION. Also update `review-parser.test.ts` `SIX_SECTION_REVIEW` fixture to use the new names.

### Pitfall 5: `BuildPromptOptions` Callers Break on New Required Fields
**What goes wrong:** `ReviewPanel.ts` calls `buildPrompt({...})` — if `reviewComments` and `prUrl` are added as required fields, TypeScript will flag the existing call site before the patch is applied.
**Why it happens:** TypeScript strict mode enforces all required interface fields.
**How to avoid:** Tasks must be ordered: add fields to interface + update caller in the same task, or make new fields optional with defaults (`reviewComments: ReviewComment[] = []`) until the caller is updated.

### Pitfall 6: Commit Message Subject Line vs Full Message
**What goes wrong:** `listCommits` returns full commit messages including multi-line bodies (subject + blank line + body paragraphs). Passing the full message inflates the prompt and can confuse the model.
**Why it happens:** GitHub API returns the full `commit.message` string.
**How to avoid:** Extract only the subject line: `commit.commit.message.split('\n')[0]`. This matches what `git log --oneline` produces.

---

## Code Examples

### fetchReviewComments — New Function Pattern

```typescript
// Source pattern: src/easy-review/github/DiffFetcher.ts
import type { Octokit } from '@octokit/rest';

export interface ReviewComment {
  reviewer: string;
  file?: string;
  line?: number;
  body: string;
}

export async function fetchReviewComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<ReviewComment[]> {
  const results: ReviewComment[] = [];

  // Line-level comments (inline diff comments)
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const lineComments = await (octokit as any).rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  for (const c of lineComments.data) {
    results.push({
      reviewer: c.user?.login ?? 'unknown',
      file: c.path,
      line: c.line ?? c.original_line,
      body: c.body,
    });
  }

  // PR-level review summaries
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const reviews = await (octokit as any).rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
  });
  for (const r of reviews.data) {
    if (r.body?.trim()) {
      results.push({
        reviewer: r.user?.login ?? 'unknown',
        body: r.body,
      });
    }
  }

  return results;
}
```

### fetchPRCommits — New Function Pattern

```typescript
// Source pattern: src/easy-review/github/DiffFetcher.ts
export async function fetchPRCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string[]> {
  // eslint-disable-next-line rulesdir/no-cast-to-any
  const response = await (octokit as any).rest.pulls.listCommits({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });
  // Extract subject line only (first line of commit message)
  return response.data.map((c: any) => c.commit.message.split('\n')[0]);
}
```

### Promise.all Wiring in ReviewPanel.ts executeReview()

```typescript
// Replace the existing sequential diff fetch in executeReview()
// Current (lines ~194): const diff = await fetchPRDiff(octokit, owner, repo, pr.prNumber);
// New:
const [diff, reviewComments, commitMessages] = await Promise.all([
  fetchPRDiff(octokit, owner, repo, pr.prNumber),
  fetchReviewComments(octokit, owner, repo, pr.prNumber),
  fetchPRCommits(octokit, owner, repo, pr.prNumber),
]);
```

### Review Comments Section in Prompt

```typescript
// In buildPrompt() — new data section before the SYNTHESIS_INSTRUCTION
if (opts.reviewComments.length > 0) {
  const commentLines = opts.reviewComments.map(c => {
    const location = c.file
      ? `${c.file}${c.line ? `:${c.line}` : ''}`
      : '(PR-level)';
    return `- **${c.reviewer}** (${location}): ${c.body}`;
  });
  parts.push(`## Review Comments\n${commentLines.join('\n')}`);
} else {
  parts.push('## Review Comments\nNo review comments on this PR.');
}
```

### PR URL Field in Prompt

```typescript
// In buildPrompt() — add to PR metadata section or as standalone field
parts.push(
  `## Pull Request\n` +
  `Title: ${opts.pr.prTitle}\n` +
  `Author: ${opts.pr.author}\n` +
  `PR #${opts.pr.prNumber}\n` +
  `URL: ${opts.prUrl}\n\n` +
  `${opts.pr.description || '(no description)'}`,
);
```

### PR URL Construction in ReviewPanel.ts

```typescript
// ReviewPanel.ts — after line 193 where owner/repo are split
const [owner, repo] = pr.repoId.split('/');
const prUrl = `https://github.com/${owner}/${repo}/pull/${pr.prNumber}`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Thin 8-line instructions block | Full SYNTHESIS_INSTRUCTION with section-by-section guidance, bad/good examples, annotation rules | This phase | Review quality jumps from "structured output" to "insight-rich analysis" |
| `commitMessages: []` hardcoded | Fetched from `octokit.rest.pulls.listCommits` | This phase | Model can reference actual commit intent in Executive Summary and Categorized Changes |
| No review comments in prompt | `fetchReviewComments` populates `## Review Comments` data section | This phase | Model can synthesize reviewer feedback into Code Review Findings |
| `## Findings` heading | `## Code Review Findings` | This phase | More descriptive; backward-compatible via existing `includes('finding')` substring match |
| `## Mermaid Diagram` heading | `## Visual Overview` | This phase | Aligns with Privanote output quality bar |

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is not a rename/refactor/migration phase. No runtime state contains the changed section headings; they exist only in prompt instructions and test fixtures, both of which are code edits.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@octokit/rest` | `fetchReviewComments`, `fetchPRCommits` | Yes | upstream version | — |
| `octokit.rest.pulls.listReviewComments` | D-05 | Yes | confirmed at runtime | — |
| `octokit.rest.pulls.listReviews` | D-05 | Yes | confirmed at runtime | — |
| `octokit.rest.pulls.listCommits` | D-08 | Yes | confirmed at runtime | — |
| `vitest` | Tests | Yes | installed | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (installed) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `buildPrompt` emits `## Code Review Findings` heading | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | Yes — needs update |
| `buildPrompt` emits `## Visual Overview` heading | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | Yes — needs update |
| `buildPrompt` includes `prUrl` field in output | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | Yes — needs new test |
| `buildPrompt` renders review comments flat list when non-empty | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | Yes — needs new test |
| `buildPrompt` renders "No review comments" when `reviewComments: []` | unit | `npx vitest run src/test/unit/prompt-builder.test.ts` | Yes — needs new test |
| `parseReview` fires findings parser on `## Code Review Findings` | unit | `npx vitest run src/test/unit/review-parser.test.ts` | Yes — needs update |
| `fetchReviewComments` returns `ReviewComment[]` from Octokit mocks | unit | new test file | No — Wave 0 gap |
| `fetchPRCommits` returns subject lines from Octokit mocks | unit | new test file | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npx vitest run src/test/unit/prompt-builder.test.ts src/test/unit/review-parser.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (excluding the pre-existing `sqlite.test.ts` ERR_DLOPEN_FAILED failures which are an environment issue unrelated to this phase)

### Wave 0 Gaps

- [ ] `src/test/unit/github-fetchers.test.ts` — unit tests for `fetchReviewComments` and `fetchPRCommits` with mocked Octokit; covers the `per_page: 100`, empty-body filter, and subject-line extraction behaviors documented as pitfalls

*(Existing test files `prompt-builder.test.ts` and `review-parser.test.ts` cover the other requirements but need assertions updated for renamed headings and new fields.)*

---

## Open Questions

1. **Per-page limit on review comments**
   - What we know: Default page size is 30; we use `per_page: 100`
   - What's unclear: Whether any PR in practice exceeds 100 inline comments (extremely rare)
   - Recommendation: Use `per_page: 100` without full pagination for now; add a comment noting the limit. Full `octokit.paginate()` can be added later if needed.

2. **SYNTHESIS_INSTRUCTION source text**
   - What we know: The instruction was provided verbatim by the user in the /gsd:discuss-phase session (not recoverable in this context)
   - What's unclear: The exact text is not available to the researcher; it must be obtained from the session conversation or provided again
   - Recommendation: Planner must note that Task 3 (rewrite PromptBuilder) requires the SYNTHESIS_INSTRUCTION text from the user session. The executor cannot reconstruct it from memory. Either (a) the user re-provides it at execution time, or (b) the planner embeds it directly in the PLAN.md task body as a verbatim code block.

---

## Sources

### Primary (HIGH confidence)

- Runtime introspection: `typeof octokit.rest.pulls.listReviewComments === 'function'` — confirmed present in installed `@octokit/rest` version
- `src/easy-review/github/DiffFetcher.ts` — established fetcher pattern
- `src/easy-review/cli/PromptBuilder.ts` — current prompt structure, `BuildPromptOptions` interface
- `src/easy-review/cli/ReviewParser.ts` — `buildSection()` guard logic
- `src/easy-review/panel/ReviewPanel.ts` — integration wiring, `owner`/`repo` split at line 193
- `src/test/unit/prompt-builder.test.ts` — existing assertions that need updating (Pitfall 4)
- `src/test/unit/review-parser.test.ts` — existing `SIX_SECTION_REVIEW` fixture (needs heading rename)
- `@octokit/plugin-rest-endpoint-methods` type definitions — endpoint path confirmation for `listReviewComments`, `listReviews`, `listCommits`

### Secondary (MEDIUM confidence)

- GitHub REST API docs (from Octokit endpoint path inference): `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments`, `/reviews`, `/commits`

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all dependencies confirmed at runtime, zero new packages
- Architecture patterns: HIGH — all patterns directly observed in existing source files
- Pitfalls: HIGH — derived from direct code inspection (test assertions, Octokit defaults, TypeScript strict mode behavior)
- SYNTHESIS_INSTRUCTION text: LOW — the source text was provided in a prior session not accessible here; the executor must obtain it from the user

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain — Octokit REST API, TS interfaces)
