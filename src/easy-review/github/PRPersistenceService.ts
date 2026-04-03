import type { Octokit } from '@octokit/rest';
import { fetchPRByNumber } from './AllStatesPRFetcher';
import type { StorageAdapter, StoredPR } from '../storage/StorageAdapter';
import type { EasyReviewPRsProvider } from '../providers/EasyReviewPRsProvider';

/**
 * Orchestrates: fetch from GitHub → convert to StoredPR →
 * save to SQLite → update tree provider.
 *
 * Keeps the command handler thin — all logic here is testable.
 */
export class PRPersistenceService {
  constructor(
    private readonly store: StorageAdapter,
    private readonly provider: EasyReviewPRsProvider,
  ) {}

  /**
   * Fetch a PR by (owner, repo, prNumber) and persist it.
   * Called by the "Add by URL" command (D-05) and the auto-list refresh.
   */
  async fetchAndPersistPR(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<StoredPR> {
    const fetched = await fetchPRByNumber(octokit, owner, repo, prNumber);

    const storedPR: StoredPR = {
      repoId: `${owner}/${repo}`,
      prNumber: fetched.number,
      title: fetched.title,
      state: fetched.state,
      author: fetched.author,
      url: fetched.url,
      addedAt: Date.now(),
      updatedAt: new Date(fetched.updatedAt).getTime(),
      raw: JSON.stringify(fetched.raw),
    };

    this.store.savePR(storedPR);   // persist to SQLite (D-06)
    this.provider.addPR(storedPR); // update sidebar tree
    return storedPR;
  }

  /**
   * Remove a PR and all its associated data (D-07).
   */
  removePR(repoId: string, prNumber: number): void {
    this.store.deletePR(repoId, prNumber);
    this.provider.removePR(repoId, prNumber);
  }
}
