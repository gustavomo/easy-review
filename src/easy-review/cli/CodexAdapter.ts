import type { CLIAdapter } from './ClaudeAdapter';

/**
 * Codex CLI adapter for ReviewRunner.
 * Flags: determined empirically at implementation time (see RESEARCH.md Pitfall 1).
 *
 * SPIKE RESULT: Codex CLI output format is unknown at plan-write time — treat as spike.
 * If codex outputs plain text to stdout (not JSON), extractText returns the line as-is.
 * If codex outputs JSON events, update extractText to parse them (copy Claude JSON parsing logic).
 *
 * Default implementation assumes plain-text stdout with JSON detection fallback.
 * Update buildArgs after running: codex --help
 */
export class CodexAdapter implements CLIAdapter {
  buildArgs(_prompt: string): string[] {
    // Prompt is written to stdin by ReviewRunner.
    // `codex exec --json` runs non-interactively and emits JSONL events to stdout.
    return ['exec', '--json', '--skip-git-repo-check'];
  }

  extractText(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed) { return null; }
    try {
      const event = JSON.parse(trimmed);
      // Text arrives in a single item.completed event:
      //   {"type":"item.completed","item":{"type":"agent_message","text":"..."}}
      if (
        event?.type === 'item.completed' &&
        event?.item?.type === 'agent_message' &&
        typeof event?.item?.text === 'string'
      ) {
        return event.item.text;
      }
    } catch {
      // Non-JSON line — ignore
    }
    return null;
  }
}
