import { describe, it } from 'vitest';

describe('SubprocessRunner', () => {
  it.todo('runClaudeStreaming spawns process with --print --output-format stream-json --include-partial-messages');
  it.todo('runClaudeStreaming writes prompt to stdin');
  it.todo('runClaudeStreaming appends text events to OutputChannel');
  it.todo('runClaudeStreaming resolves with full output on exit code 0');
  it.todo('runClaudeStreaming rejects on non-zero exit code');
  it.todo('runClaudeStreaming kills process and rejects on cancellation token');
  it.todo('runClaudeStreaming kills process and rejects after 5-minute timeout');
});
