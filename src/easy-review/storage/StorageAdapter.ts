import type { StoredPR } from './types';

/**
 * Abstract storage interface. Implemented by SQLiteStore (primary) and
 * a no-op fallback if native module loading fails (D-10).
 */
export interface StorageAdapter {
  initialize(storagePath: string): void;
  savePR(pr: StoredPR): void;
  getPRs(): StoredPR[];
  getPR(repoId: string, prNumber: number): StoredPR | undefined;
  deletePR(repoId: string, prNumber: number): void;
  close(): void;
}

export type { StoredPR };
