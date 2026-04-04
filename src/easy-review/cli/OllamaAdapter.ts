import type { ModelAdapter, ModelRunOpts } from './ModelAdapter';
import { getOutputChannel } from './OutputChannelReporter';

const OLLAMA_BASE = 'http://localhost:11434';

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

interface OllamaStreamEvent {
  response?: string;
  done?: boolean;
  error?: string;
}

/**
 * OllamaAdapter implements ModelAdapter for the Ollama HTTP API.
 * POSTs to http://localhost:11434/api/generate with stream: true.
 *
 * Call OllamaAdapter.checkSetup(modelId) before dispatching to get a clear
 * actionable error if Ollama is not running or the model is not installed.
 */
export class OllamaAdapter implements ModelAdapter {

  /**
   * Pre-flight check: verifies Ollama is running and the requested model is installed.
   * Throws with exact ollama CLI commands to fix the problem.
   */
  static async checkSetup(modelId: string): Promise<void> {
    // 1. Connectivity check
    let tagsResponse: Response;
    try {
      tagsResponse = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(4000) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
        throw new Error(
          'Ollama is not running.\n\n' +
          'Start it with:\n  ollama serve\n\n' +
          'Or install Ollama from https://ollama.com if you haven\'t already.',
        );
      }
      throw new Error(`Cannot reach Ollama at ${OLLAMA_BASE}: ${msg}`);
    }

    if (!tagsResponse.ok) {
      throw new Error(`Ollama returned HTTP ${tagsResponse.status}. Is it running correctly?`);
    }

    // 2. Model availability check
    const tags = await tagsResponse.json() as OllamaTagsResponse;
    const installedNames = (tags.models ?? []).map(m => m.name);

    // Ollama model names can be "gemma3:12b" or "gemma3:latest" — match by base name
    const baseRequested = modelId.includes(':') ? modelId : `${modelId}:latest`;
    const isInstalled = installedNames.some(n => {
      const base = n.includes(':') ? n : `${n}:latest`;
      return base === baseRequested || n === modelId;
    });

    if (!isInstalled) {
      const installed = installedNames.length > 0
        ? `\n\nInstalled models: ${installedNames.join(', ')}`
        : '\n\nNo models installed yet.';
      throw new Error(
        `Ollama model '${modelId}' is not installed.${installed}\n\n` +
        `Install it with:\n  ollama pull ${modelId}`,
      );
    }
  }

  async run(opts: ModelRunOpts): Promise<string> {
    const ch = getOutputChannel();
    ch.appendLine(`[OllamaAdapter] model=${opts.modelId} agent=${opts.agentKey}`);

    if (!opts.modelId) {
      throw new Error(
        'No Ollama model specified. Set easyReview.ollamaModel in VS Code settings ' +
        '(e.g. "gemma3:12b"). Run "ollama list" to see installed models.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: opts.modelId,
          prompt: opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.prompt}` : opts.prompt,
          stream: true,
        }),
        signal: opts.abortSignal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        throw new Error(
          'Ollama is not running. Start it with: ollama serve',
        );
      }
      throw err;
    }

    if (!response.ok) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      // Ollama returns {"error":"model not found"} as a non-2xx response body
      try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error) {
          if (parsed.error.includes('not found') || parsed.error.includes('pull')) {
            throw new Error(
              `Ollama model '${opts.modelId}' not found.\n` +
              `Install it with: ollama pull ${opts.modelId}`,
            );
          }
          throw new Error(`Ollama error: ${parsed.error}`);
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.startsWith('Ollama')) {
          throw parseErr;
        }
      }
      throw new Error(`Ollama HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    let fullOutput = '';
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let leftover = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) { break; }
      const chunk = leftover + decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      leftover = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) { continue; }
        try {
          const event = JSON.parse(trimmed) as OllamaStreamEvent;
          if (event.error) {
            throw new Error(`Ollama stream error: ${event.error}`);
          }
          if (typeof event.response === 'string') {
            fullOutput += event.response;
            opts.onChunk(event.response);
          }
          if (event.done) { break; }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message.startsWith('Ollama')) {
            throw parseErr;
          }
          // skip malformed ndjson lines
        }
      }
    }

    if (!fullOutput) {
      throw new Error(
        `Ollama returned empty output for model '${opts.modelId}'. ` +
        'The model may have timed out or run out of memory.',
      );
    }

    ch.appendLine(`[OllamaAdapter] complete, output.length=${fullOutput.length}`);
    return fullOutput;
  }
}
