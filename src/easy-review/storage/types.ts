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
