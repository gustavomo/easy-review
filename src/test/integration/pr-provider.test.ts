import { describe, it } from 'vitest';
// Integration test — requires actual VS Code instance via @vscode/test-electron
// These tests will be migrated to mocha + @vscode/test-electron runner in a follow-up

describe('EasyReviewPRsProvider (integration)', () => {
  it.todo('getChildren() returns flat list of PRTreeItem for open, closed, and merged PRs');
  it.todo('PRTreeItem for open PR has green badge');
  it.todo('PRTreeItem for merged PR has purple badge');
  it.todo('PRTreeItem for closed PR has red badge');
  it.todo('refresh() updates the tree with new PR list');
});
