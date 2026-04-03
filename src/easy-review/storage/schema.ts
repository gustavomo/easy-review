/**
 * DDL for the prs table. Phase 1 only — reviews, comments, and analyses
 * tables will be added in Phase 2 via migrations.
 * Composite primary key: (repo_id, pr_number) — uniquely identifies a PR across repos.
 */
export const PR_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS prs (
    repo_id     TEXT    NOT NULL,
    pr_number   INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    state       TEXT    NOT NULL CHECK(state IN ('open', 'closed', 'merged')),
    author      TEXT    NOT NULL DEFAULT '',
    url         TEXT    NOT NULL DEFAULT '',
    added_at    INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    raw         TEXT    NOT NULL DEFAULT '{}',
    PRIMARY KEY (repo_id, pr_number)
  ) STRICT;
`;

/**
 * DDL for the reviews table. Phase 2 — REV-04, REV-05, VIEW-03.
 * Multiple reviews per PR are preserved (no unique constraint on repo_id + pr_number).
 */
export const REVIEWS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id     TEXT    NOT NULL,
    pr_number   INTEGER NOT NULL,
    model_used  TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    review_text TEXT    NOT NULL,
    parsed_json TEXT    NOT NULL DEFAULT '{}'
  ) STRICT;
`;

/**
 * DDL for the project_analyses table. Phase 2 — PROJ-03.
 * Single-row policy (D-35): only one analysis row is retained at any time.
 * Enforced via DELETE + INSERT in saveProjectAnalysis().
 */
export const PROJECT_ANALYSES_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS project_analyses (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    collected_at INTEGER NOT NULL,
    context_text TEXT    NOT NULL
  ) STRICT;
`;
