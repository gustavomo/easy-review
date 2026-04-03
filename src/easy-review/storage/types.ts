export interface StoredPR {
  repoId: string;        // "{owner}/{repo}"
  prNumber: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  url: string;
  addedAt: number;       // Unix timestamp ms
  updatedAt: number;     // Unix timestamp ms
  raw: string;           // JSON.stringify of GitHub API response for full data access
}

/** Phase 2 — REV-04, REV-05, VIEW-03: persisted AI review for a PR */
export interface StoredReview {
  id: number;
  repoId: string;
  prNumber: number;
  modelUsed: string;
  createdAt: number;    // Unix timestamp ms
  reviewText: string;   // raw CLI output
  parsedJson: string;   // JSON.stringify(ParsedReview.sections)
}

/** Phase 2 — PROJ-03: single-row project context snapshot (D-35) */
export interface StoredProjectAnalysis {
  id: number;
  collectedAt: number;  // Unix timestamp ms
  contextText: string;  // concatenated README + src listing + package.json + git log [+ PR history]
}
