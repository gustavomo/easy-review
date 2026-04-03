import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process and fs before importing PathResolver
vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('fs', () => ({ existsSync: vi.fn().mockReturnValue(false) }));

import { resolveClaudePath } from '../../easy-review/cli/PathResolver';
import * as vscodeModule from 'vscode';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

beforeEach(() => vi.clearAllMocks());

describe('resolveClaudePath', () => {
  it('returns configured path when easyReview.claudePath is set and file exists', () => {
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue('/custom/path/claude'),
    } as any);
    vi.mocked(existsSync).mockReturnValue(true);

    expect(resolveClaudePath()).toBe('/custom/path/claude');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('skips configured path when file does not exist at configured path', () => {
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue('/nonexistent/claude'),
    } as any);
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });

    const result = resolveClaudePath();
    expect(result).toBeUndefined();
  });

  it('falls back to shell detection when no configured path', () => {
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue(''),
    } as any);
    vi.mocked(execSync).mockReturnValue('/usr/local/bin/claude\n' as any);
    vi.mocked(existsSync).mockImplementation((p) => p === '/usr/local/bin/claude');

    expect(resolveClaudePath()).toBe('/usr/local/bin/claude');
  });

  it('falls back to common paths when shell detection fails', () => {
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue(''),
    } as any);
    vi.mocked(execSync).mockImplementation(() => { throw new Error('zsh: command not found'); });
    vi.mocked(existsSync).mockImplementation((p) => String(p).endsWith('/opt/homebrew/bin/claude'));

    expect(resolveClaudePath()).toBe('/opt/homebrew/bin/claude');
  });

  it('returns undefined when claude is not found anywhere', () => {
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue(''),
    } as any);
    vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });
    vi.mocked(existsSync).mockReturnValue(false);

    expect(resolveClaudePath()).toBeUndefined();
  });

  it('respects priority order: settings > shell-detection > common-paths', () => {
    // When settings path exists, shell detection should never be called
    vi.spyOn(vscodeModule.workspace, 'getConfiguration').mockReturnValue({
      get: vi.fn().mockReturnValue('/settings/claude'),
    } as any);
    vi.mocked(existsSync).mockReturnValue(true);

    resolveClaudePath();
    expect(execSync).not.toHaveBeenCalled();
  });
});
