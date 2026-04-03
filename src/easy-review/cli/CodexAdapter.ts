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
  buildArgs(prompt: string): string[] {
    // TODO: Update flags after empirical spike.
    // Candidates based on typical Codex CLI patterns:
    //   codex --quiet "{prompt}"      (suppress progress output)
    //   codex "{prompt}"              (basic invocation)
    // Run `codex --help` to confirm available flags.
    return ['--quiet', prompt];
  }

  extractText(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed) { return null; }

    // First attempt: try JSON parsing (in case codex uses JSON events like Claude)
    try {
      const event = JSON.parse(trimmed);
      const text = event?.delta?.text ?? event?.text ?? event?.content ?? null;
      if (typeof text === 'string') { return text; }
    } catch {
      // Not JSON — treat as plain text
    }

    // Plain text fallback
    return trimmed;
  }
}
