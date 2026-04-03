import { describe, it } from 'vitest';
// import { runReview } from '../../easy-review/cli/ReviewRunner';

describe('ReviewRunner', () => {
  // REV-01: trigger generation
  it.todo('calls the CLI subprocess with the assembled prompt and returns raw output string');
  it.todo('accepts a CancellationToken and rejects the promise when token is cancelled');

  // REV-03: streaming
  it.todo('calls onChunk with accumulated text at 200ms intervals during streaming');
  it.todo('clears the batch interval in the finally block even when generation fails');
  it.todo('passes codex CLI args when adapter is CodexAdapter');
});
