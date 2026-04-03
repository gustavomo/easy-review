import { describe, it, expect, vi } from 'vitest';

import { runClaudeStreaming } from '../../easy-review/cli/SubprocessRunner';
import type { RunOptions } from '../../easy-review/cli/SubprocessRunner';

describe('SubprocessRunner exports', () => {
  it('exports runClaudeStreaming function', () => {
    expect(typeof runClaudeStreaming).toBe('function');
  });

  it('RunOptions type requires prompt, token, and outputChannel', () => {
    // Type-level test: verify RunOptions shape compiles
    const opts: RunOptions = {
      prompt: 'test prompt',
      token: { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) } as any,
      outputChannel: { append: () => {}, appendLine: () => {}, show: () => {}, dispose: () => {} } as any,
    };
    expect(opts.prompt).toBe('test prompt');
  });

  it.todo('runClaudeStreaming spawns process with --print --output-format stream-json --include-partial-messages');
  it.todo('runClaudeStreaming writes prompt to stdin');
  it.todo('runClaudeStreaming appends text events to OutputChannel');
  it.todo('runClaudeStreaming resolves with full output on exit code 0');
  it.todo('runClaudeStreaming rejects on non-zero exit code');
  it.todo('runClaudeStreaming kills process and rejects on cancellation token');
  it.todo('runClaudeStreaming kills process and rejects after 5-minute timeout');
});
