import type { ModelAdapter, ModelRunOpts } from './ModelAdapter';
import { getOutputChannel } from './OutputChannelReporter';

/**
 * OllamaAdapter implements ModelAdapter for Ollama HTTP API (D-11).
 * POSTs to http://localhost:11434/api/generate with stream: true.
 * Parses ndjson response line by line using ReadableStream reader + TextDecoder.
 * Uses Node built-in fetch (NOT axios, NOT node-fetch).
 */
export class OllamaAdapter implements ModelAdapter {
  async run(opts: ModelRunOpts): Promise<string> {
    const ch = getOutputChannel();
    ch.appendLine(`[OllamaAdapter] model=${opts.model} agent=${opts.agentKey} prompt.length=${opts.prompt.length}`);

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.systemPrompt ? `${opts.systemPrompt}\n\n${opts.prompt}` : opts.prompt,
        stream: true,
      }),
      signal: opts.abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
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
          const event = JSON.parse(trimmed) as { response?: string; done?: boolean };
          if (typeof event.response === 'string') {
            fullOutput += event.response;
            opts.onChunk(event.response);
          }
          if (event.done) { break; }
        } catch {
          // skip malformed lines
        }
      }
    }

    ch.appendLine(`[OllamaAdapter] complete, output.length=${fullOutput.length}`);
    return fullOutput;
  }
}
