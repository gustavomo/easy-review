import Database from 'better-sqlite3';
import * as vscode from 'vscode';
import { PR_TABLE_DDL, REVIEWS_TABLE_DDL, PROJECT_ANALYSES_TABLE_DDL } from './schema';
import type { StorageAdapter } from './StorageAdapter';
import type { StoredPR, StoredReview, StoredProjectAnalysis } from './types';

export class SQLiteStore implements StorageAdapter {
  private db!: Database.Database;

  initialize(storagePath: string): void {
    // DB-02: surface ABI mismatch as actionable error
    try {
      this.db = new Database(storagePath);
      this.db.pragma('journal_mode = WAL');   // D-11
      this.db.pragma('integrity_check');       // D-11
      this.db.exec(PR_TABLE_DDL);
      this.db.exec(REVIEWS_TABLE_DDL);
      this.db.exec(PROJECT_ANALYSES_TABLE_DDL);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(
        `Easy Review: SQLite failed to initialize. ${msg}. ` +
        `This may be a native module ABI mismatch. ` +
        `Try running 'npm run rebuild:sqlite' or reloading VS Code.`,
        'Open Output'
      );
      throw err;
    }
  }

  savePR(pr: StoredPR): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO prs
        (repo_id, pr_number, title, state, author, url, added_at, updated_at, raw)
      VALUES
        (@repoId, @prNumber, @title, @state, @author, @url, @addedAt, @updatedAt, @raw)
    `);
    stmt.run(pr);
  }

  getPRs(): StoredPR[] {
    const rows = this.db.prepare(
      `SELECT * FROM prs ORDER BY updated_at DESC`
    ).all() as Array<Record<string, unknown>>;
    return rows.map(this.rowToStoredPR);
  }

  getPR(repoId: string, prNumber: number): StoredPR | undefined {
    const row = this.db.prepare(
      `SELECT * FROM prs WHERE repo_id = ? AND pr_number = ?`
    ).get(repoId, prNumber) as Record<string, unknown> | undefined;
    return row ? this.rowToStoredPR(row) : undefined;
  }

  deletePR(repoId: string, prNumber: number): void {
    this.db.prepare(
      `DELETE FROM prs WHERE repo_id = ? AND pr_number = ?`
    ).run(repoId, prNumber);
  }

  close(): void {
    this.db?.close();
  }

  saveReview(review: Omit<StoredReview, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (repo_id, pr_number, model_used, created_at, review_text, parsed_json)
      VALUES (@repoId, @prNumber, @modelUsed, @createdAt, @reviewText, @parsedJson)
    `);
    const result = stmt.run(review);
    return result.lastInsertRowid as number;
  }

  getReviews(repoId: string, prNumber: number): StoredReview[] {
    const rows = this.db.prepare(`
      SELECT id, repo_id AS repoId, pr_number AS prNumber, model_used AS modelUsed,
             created_at AS createdAt, review_text AS reviewText, parsed_json AS parsedJson
      FROM reviews
      WHERE repo_id = ? AND pr_number = ?
      ORDER BY created_at DESC
    `).all(repoId, prNumber) as StoredReview[];
    return rows;
  }

  saveProjectAnalysis(analysis: Omit<StoredProjectAnalysis, 'id'>): void {
    // Single-row policy (D-35): delete existing row, then insert fresh
    this.db.exec('DELETE FROM project_analyses');
    this.db.prepare(`
      INSERT INTO project_analyses (collected_at, context_text)
      VALUES (@collectedAt, @contextText)
    `).run(analysis);
  }

  getProjectAnalysis(): StoredProjectAnalysis | null {
    const row = this.db.prepare(`
      SELECT id, collected_at AS collectedAt, context_text AS contextText
      FROM project_analyses
      LIMIT 1
    `).get() as StoredProjectAnalysis | undefined;
    return row ?? null;
  }

  private rowToStoredPR(row: Record<string, unknown>): StoredPR {
    return {
      repoId: row['repo_id'] as string,
      prNumber: row['pr_number'] as number,
      title: row['title'] as string,
      state: row['state'] as 'open' | 'closed' | 'merged',
      author: row['author'] as string,
      url: row['url'] as string,
      addedAt: row['added_at'] as number,
      updatedAt: row['updated_at'] as number,
      raw: row['raw'] as string,
    };
  }
}
