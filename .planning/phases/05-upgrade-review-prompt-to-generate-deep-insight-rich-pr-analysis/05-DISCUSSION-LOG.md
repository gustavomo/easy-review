# Phase 5: Upgrade Review Prompt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 05-upgrade-review-prompt-to-generate-deep-insight-rich-pr-analysis
**Areas discussed:** Prompt instructions depth, Data enrichment — review comments, Data enrichment — commit messages, Section names & structure

---

## Prompt Instructions Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full port | Copy Privanote SYNTHESIS_INSTRUCTION level of detail: bad/good examples, per-file before/after rules, annotation requirements, Mermaid specificity rules | ✓ |
| Structured but lighter | Same headings and key rules but skip verbose examples | |
| Minimal upgrade | Just rename sections and ask for annotated snippets | |

**User's choice:** Full port

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single prompt (no split) | Everything in one message via stdin; preserves D-07 same path for both CLIs | ✓ |
| Split system + user | System prompt for role/rules, user message for data; breaks D-07 symmetry | |

**User's choice:** Single prompt

---

| Option | Description | Selected |
|--------|-------------|----------|
| Adapt verbatim | Take Privanote SYNTHESIS_INSTRUCTION as base, replace ADK references, keep all rules | ✓ |
| Rewrite from scratch | New prompt achieving same depth | |

**User's choice:** Adapt verbatim

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline constant in PromptBuilder.ts | `const SYNTHESIS_INSTRUCTION` at top of file | ✓ |
| Separate file (reviewPrompt.ts) | Extracted to its own file | |

**User's choice:** Inline constant in PromptBuilder.ts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include PR URL pattern | Pass PR GitHub URL so model generates clickable file links | ✓ |
| Skip links | No file URLs in output | |

**User's choice:** Include PR URL pattern

---

## Data Enrichment — Review Comments

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch and include | New fetchReviewComments() with listReviewComments + listReviews | ✓ |
| Skip for now | Leave Code Review Findings section with no comment data | |

**User's choice:** Fetch and include

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full detail | reviewer login, file path, line number, comment body | ✓ |
| Body only | Just comment text | |

**User's choice:** Full detail

---

## Data Enrichment — Commit Messages

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch commit messages | fetchPRCommits() via octokit.rest.pulls.listCommits | ✓ |
| Leave empty | Keep commitMessages: [] | |

**User's choice:** Fetch commit messages

---

## Section Names & Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Rename + update ReviewParser | Findings → Code Review Findings, Mermaid Diagram → Visual Overview; update parser | ✓ |
| Keep current names | Prompt richer internally but headings unchanged | |

**User's choice:** Rename + update ReviewParser

---

| Option | Description | Selected |
|--------|-------------|----------|
| Omit empty sections | Skip Key Code Changes / Code Review Findings when data absent | |
| Always output all sections | Preserve D-07 6-section contract | ✓ |

**User's choice:** Always output all sections (preserve D-07)
