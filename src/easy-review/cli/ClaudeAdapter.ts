/**
 * Claude CLI adapter for ReviewRunner.
 * Flags: --print --verbose --output-format stream-json --include-partial-messages
 * These flags are verified against claude 2.1.87 (see SubprocessRunner.ts comments and Phase 1 validation).
 *
 * Stream-json event format:
 * Each stdout line is a JSON object. Text chunks arrive in events of the form:
 *   {"type":"content_block_delta","delta":{"type":"text_delta","text":"...chunk..."}}
 * Other event types (init, ping, etc.) are skipped by returning null from extractText.
 *
 * Note: SubprocessRunner.ts uses --verbose which wraps events in stream_event:
 *   event.event?.delta?.text  (stream_event content_block_delta)
 * Both paths are checked so this adapter is robust to both formats.
 */

export interface CLIAdapter {
  buildArgs(prompt: string): string[];
  extractText(line: string): string | null;
}

export class ClaudeAdapter implements CLIAdapter {
  buildArgs(prompt: string): string[] {
    return [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--include-partial-messages',
      prompt,
    ];
  }

  extractText(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed) { return null; }
    try {
      const event = JSON.parse(trimmed);
      // Primary path: stream-json text delta event (verified in Phase 1)
      // delta.text: content_block_delta direct format
      // event.delta.text: nested stream_event format (--verbose)
      const text =
        event?.delta?.text ??
        event?.event?.delta?.text ??
        event?.text ??
        null;
      return typeof text === 'string' ? text : null;
    } catch {
      return null;
    }
  }
}
