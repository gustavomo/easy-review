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
