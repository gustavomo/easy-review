import { describe, it, expect, vi } from 'vitest';

// We test behavior via mock adapters and a fake CancellationToken
// rather than spawning real processes in unit tests.

describe('ReviewRunner', () => {
  it('exports runReview function', async () => {
    const mod = await import('../../easy-review/cli/ReviewRunner');
    expect(typeof mod.runReview).toBe('function');
  });

  it('CLIAdapter interface: ClaudeAdapter.buildArgs returns array starting with --print', async () => {
    const { ClaudeAdapter } = await import('../../easy-review/cli/ClaudeAdapter');
    const adapter = new ClaudeAdapter();
    const args = adapter.buildArgs('test prompt');
    expect(args[0]).toBe('--print');
    expect(args).toContain('--output-format');
  });

  it('ClaudeAdapter.extractText returns null for non-JSON lines', async () => {
    const { ClaudeAdapter } = await import('../../easy-review/cli/ClaudeAdapter');
    const adapter = new ClaudeAdapter();
    expect(adapter.extractText('')).toBeNull();
    expect(adapter.extractText('not json')).toBeNull();
  });

  it('ClaudeAdapter.extractText extracts text from stream-json delta events', async () => {
    const { ClaudeAdapter } = await import('../../easy-review/cli/ClaudeAdapter');
    const adapter = new ClaudeAdapter();
    const line = JSON.stringify({ delta: { text: 'hello' } });
    expect(adapter.extractText(line)).toBe('hello');
  });

  it('ClaudeAdapter.extractText extracts text from nested stream_event delta', async () => {
    const { ClaudeAdapter } = await import('../../easy-review/cli/ClaudeAdapter');
    const adapter = new ClaudeAdapter();
    const line = JSON.stringify({ event: { delta: { text: 'nested' } } });
    expect(adapter.extractText(line)).toBe('nested');
  });

  it('CodexAdapter exports buildArgs and extractText', async () => {
    const { CodexAdapter } = await import('../../easy-review/cli/CodexAdapter');
    const adapter = new CodexAdapter();
    expect(typeof adapter.buildArgs).toBe('function');
    expect(typeof adapter.extractText).toBe('function');
  });

  it('CodexAdapter.extractText returns plain text for non-JSON lines', async () => {
    const { CodexAdapter } = await import('../../easy-review/cli/CodexAdapter');
    const adapter = new CodexAdapter();
    expect(adapter.extractText('plain text output')).toBe('plain text output');
    expect(adapter.extractText('')).toBeNull();
  });

  it('CodexAdapter.extractText extracts text from JSON events if present', async () => {
    const { CodexAdapter } = await import('../../easy-review/cli/CodexAdapter');
    const adapter = new CodexAdapter();
    const line = JSON.stringify({ text: 'json codex output' });
    expect(adapter.extractText(line)).toBe('json codex output');
  });
});
