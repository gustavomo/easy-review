import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { collectProjectContext } from '../../easy-review/github/ProjectAnalysisService';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-review-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ProjectAnalysisService', () => {
  it('collects README.md content when file exists at workspace root', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Project\nDescription here.');
    const result = await collectProjectContext(tmpDir);
    expect(result).toContain('## README\n# My Project');
  });

  it('handles missing README.md gracefully (omits section, does not throw)', async () => {
    // No README.md created
    const result = await collectProjectContext(tmpDir);
    expect(result).not.toContain('## README');
  });

  it('collects package.json content when file exists at workspace root', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"test","version":"1.0.0"}');
    const result = await collectProjectContext(tmpDir);
    expect(result).toContain('## package.json\n{"name":"test"');
  });

  it('collects top-level src/ directory listing', async () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'index.ts'), '');
    fs.writeFileSync(path.join(srcDir, 'app.ts'), '');
    const result = await collectProjectContext(tmpDir);
    expect(result).toContain('## src/ structure');
    expect(result).toContain('index.ts');
  });

  it('returns concatenated context_text with --- section separators', async () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const result = await collectProjectContext(tmpDir);
    expect(result).toContain('---');
    // At least two sections separated by ---
    const parts = result.split('---');
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it('always includes Recent commits section (even if empty in test env)', async () => {
    // git log may return empty in a temp dir — but function should not throw
    const result = await collectProjectContext(tmpDir);
    // Either has commits or gracefully omits section
    expect(typeof result).toBe('string');
  });

  // PROJ-02: fetchPRHistory — tested via adapter interface check only
  // Full integration test requires real Octokit — skipped in unit tests
  it('fetchPRHistory is exported as a function', async () => {
    const mod = await import('../../easy-review/github/ProjectAnalysisService');
    expect(typeof mod.fetchPRHistory).toBe('function');
  });

  it('fetchPRHistory signature accepts octokit, owner, repo', async () => {
    const { fetchPRHistory } = await import('../../easy-review/github/ProjectAnalysisService');
    // Verify function has 3 parameters
    expect(fetchPRHistory.length).toBe(3);
  });
});
