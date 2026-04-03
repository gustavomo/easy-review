import { describe, it } from 'vitest';
// import { collectProjectContext, fetchPRHistory } from '../../easy-review/github/ProjectAnalysisService';

describe('ProjectAnalysisService', () => {
  // PROJ-01: workspace file collection
  it.todo('collects README.md content when file exists at workspace root');
  it.todo('collects package.json content when file exists at workspace root');
  it.todo('collects top-level src/ directory listing');
  it.todo('collects last 20 git log entries');
  it.todo('returns concatenated context_text with --- section separators');
  it.todo('handles missing README.md gracefully (omits section, does not throw)');

  // PROJ-02: PR history fetch
  it.todo('fetchPRHistory calls octokit.rest.pulls.list with state: all and per_page: 100');
  it.todo('appends PR history section to context_text after workspace context');
});
