import type { ReviewComment } from '../github/DiffFetcher';
import type { StoredProjectAnalysis } from '../storage/types';

export type { ReviewComment };

export interface PRMetadata {
  prNumber: number;
  prTitle: string;
  author: string;
  description: string;
  commitMessages: string[];
}

export interface BuildPromptOptions {
  pr: PRMetadata;
  diff: string;
  projectAnalysis: StoredProjectAnalysis | null;  // D-09: prepended when available
  reviewComments: ReviewComment[];   // D-07 — pass [] when unavailable
  prUrl: string;                     // D-04 — https://github.com/{owner}/{repo}/pull/{N}
}

/**
 * Full synthesis instruction ported from Privanote SYNTHESIS_INSTRUCTION (D-01).
 * Preserved verbatim. Single combined prompt per D-03 (no system/user split).
 * Backtick sequences inside the template literal are escaped as \` where needed.
 */
const SYNTHESIS_INSTRUCTION = `You are a senior software engineer writing a structured PR analysis note.
Your goal is to help a developer quickly understand WHAT this PR achieves
and WHY the changes matter — not just list what files changed.

You will receive pre-fetched data about a GitHub pull request including:
- PR metadata (title, author, branches, stats)
- PR description / body written by the author
- **Per-file diffs** in \`\`\`diff blocks — one section per changed file, each
  labelled with filename, status, and +/- line counts
- Review comments from GitHub (line-level, issue, and review-level)
- Improvement suggestions

Synthesize all this information into a structured analysis note with
these sections (in order):

## Executive Summary
**This is the most important section.** Write 3–5 sentences that answer:
1. What problem does this PR solve, or what feature does it add?
2. What was the approach / key change made?
3. What is the tangible outcome for users, developers, or the system?

BAD example: "This PR removes BulkDisburseBankAccountWarning import and JSX."
GOOD example: "Removes the bank account warning banner from the loans disbursement
flow. The warning was shown before bulk disbursal to flag accounts without a
registered bank account. This component has been superseded by the new inline
validation in the DisbursementsList, making the pre-flight warning redundant and
reducing visual noise in the confirmation modal."

Infer context from file names, component names, and diff content.
Never just restate the diff — explain the intent and outcome.

## Categorized Changes
Output a markdown table listing every changed file. Use these category values
only: Feature, Bug Fix, Refactor/Cleanup, Tests, Config/Infra.
One row per file (or group of files with identical change). Include full
GitHub PR file links in the Files Changed cell where available.

| Category | Files Changed | Description |
|---|---|---|
| Bug Fix | \`path/to/file.ts\` | What this change does |
| Tests | \`path/to/file.spec.ts\` | What this test covers |

## Key Code Changes

For **every changed file** with meaningful logic changes, show a before/after
snippet extracted from the per-file diff provided in the data.

The diff uses standard unified diff format:
- Lines starting with \`-\` were **removed** (the "before")
- Lines starting with \`+\` were **added** (the "after")
- Lines with no prefix are context (unchanged surrounding code)

Format each file as:

---

**[\`path/to/file.ts\`](github_file_link)** — one sentence on what this change achieves

_Before_
\`\`\`language
// Reconstruct the old code by taking context lines + removed (-) lines.
// Annotate each changed line with a detailed comment:
// - what this line was doing and why it was a problem or limitation
removed lines shown without the leading minus
\`\`\`

_After_
\`\`\`language
// Reconstruct the new code by taking context lines + added (+) lines.
// Annotate each changed line with a detailed comment:
// - exactly what changed and why this is now correct
// - connect to the PR goal (quote the PR description if it explains the motivation)
added lines shown without the leading plus
\`\`\`

Rules:
- Cover ALL files with substantive logic changes. Skip files that are only
  import additions, whitespace changes, or trivial renames.
- Extract the changed lines from the diff — do NOT copy the raw diff format
  (no leading +/- in the rendered snippets, reconstruct readable code).
- Comments must be DETAILED. Not "handles error" but "detects transient faults
  (e.g. temporary network unavailability) and re-throws so the retry mechanism
  upstream can recover, preventing false failure records from being persisted."
- If the PR description explains the motivation, reference it explicitly in
  the comment (e.g. "// as described in PR: prevents polluting error logs").
- Keep each snippet to the changed lines + minimal context (3–15 lines total).
- Use the correct language tag matching the file extension.
- If no diff data is provided for a file, skip that file.

## Code Review Findings
Output a flat list where each item is prefixed with a bold severity tag.
Severity values: critical, warning, suggestion.
If no review comments exist, write exactly: "No review comments on this PR."
Do NOT invent findings — only include what is in the data.

**[critical]** \`file.ts:line\` — description
**[warning]** \`file.ts:line\` — description
**[suggestion]** \`file.ts\` — description

## Impact Analysis
Output a markdown table. Each impacted area gets its own row.
Risk column uses only: Low, Low-positive, Medium, High, Positive.

| Area | Risk | Notes |
|---|---|---|
| Area name | Low/Medium/High/Positive | One sentence note |

## Visual Overview

Use a Mermaid diagram to make the changes visually understandable. This is NOT
limited to architectural changes — use it whenever a diagram adds clarity:

- **Flow changes**: use \`sequenceDiagram\` to show how the execution path changed
  (e.g. a new branch in error handling, a new step in a pipeline)
- **Component relationships**: use \`graph TD\` to show which modules now interact
  differently after the change
- **State changes**: use \`stateDiagram-v2\` to show new states or transitions
- **Before/after flows**: show two sub-graphs side by side to contrast old vs new

The diagram must be ELABORATE and specific to this PR — not generic. Label nodes
with real names from the code (function names, class names, error types, etc.).

Skip this section ONLY for single-line typo fixes or pure config/documentation
changes with no logic impact.

Use triple-backtick fencing with the \`mermaid\` language tag:

\`\`\`mermaid
sequenceDiagram
    participant A as Caller
    participant B as UseCase
    A->>B: invoke()
    B-->>A: result
\`\`\`

---

RULES:
- Include full GitHub links for the PR, changed files, and review comments
  wherever available.
- Mermaid MUST use triple-backtick fencing with \`mermaid\` tag.
- OMIT any section that has no meaningful content (except Summary, Categorized
  Changes, and Impact Analysis — those are always required).
- Key Code Changes requires actual diff data — omit it if no diff was provided.
- Output ONLY the markdown. No title, no preamble.`;

/**
 * Assembles the full review prompt for Claude/Codex CLI.
 * Per D-07: one shared template for both CLIs — same 6-section output contract.
 * Per D-08: prompt content is fixed — no user editing.
 * Per D-09: project analysis is prepended automatically when present.
 */
export function buildPrompt(opts: BuildPromptOptions): string {
  const parts: string[] = [];

  // Project analysis context (D-09) — prepended when available
  if (opts.projectAnalysis) {
    parts.push(`## Project Context\n${opts.projectAnalysis.contextText}`);
  }

  // PR metadata (D-04: include prUrl so model can construct per-file links)
  parts.push(
    `## Pull Request\nTitle: ${opts.pr.prTitle}\nAuthor: ${opts.pr.author}\nPR #${opts.pr.prNumber}\nURL: ${opts.prUrl}\n\n${opts.pr.description || '(no description)'}`,
  );

  // Commit messages
  if (opts.pr.commitMessages.length > 0) {
    parts.push(`## Commit Messages\n${opts.pr.commitMessages.join('\n')}`);
  }

  // Review comments (D-06, D-07) — flat list; "No review comments" when empty
  if (opts.reviewComments.length > 0) {
    const commentLines = opts.reviewComments.map(c => {
      const location = c.file
        ? `${c.file}${c.line !== undefined ? `:${c.line}` : ''}`
        : '(PR-level)';
      return `- **${c.reviewer}** (${location}): ${c.body}`;
    });
    parts.push(`## Review Comments\n${commentLines.join('\n')}`);
  } else {
    parts.push('## Review Comments\nNo review comments on this PR.');
  }

  // Diff
  parts.push(`## Diff\n\`\`\`diff\n${opts.diff}\n\`\`\``);

  // Full synthesis instruction (D-01, D-02, D-03)
  parts.push(SYNTHESIS_INSTRUCTION);

  return parts.join('\n\n---\n\n');
}
