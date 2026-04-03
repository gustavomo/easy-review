import type { StoredPR, StoredReview, StoredProjectAnalysis } from './types';

/**
 * Abstract storage interface. Implemented by SQLiteStore (primary) and
 * a no-op fallback if native module loading fails (D-10).
 */
export interface StorageAdapter {
  // Phase 1 — PR persistence
  initialize(storagePath: string): void;
  savePR(pr: StoredPR): void;
  getPRs(): StoredPR[];
  getPR(repoId: string, prNumber: number): StoredPR | undefined;
  deletePR(repoId: string, prNumber: number): void;
  close(): void;

  // Phase 2 — Reviews (REV-04, REV-05, VIEW-03)
  saveReview(review: Omit<StoredReview, 'id'>): number;  // returns inserted id
  getReviews(repoId: string, prNumber: number): StoredReview[];

  // Phase 2 — Project Analysis (PROJ-01, PROJ-03)
  saveProjectAnalysis(analysis: Omit<StoredProjectAnalysis, 'id'>): void;
  getProjectAnalysis(): StoredProjectAnalysis | null;
}

export type { StoredPR, StoredReview, StoredProjectAnalysis };
