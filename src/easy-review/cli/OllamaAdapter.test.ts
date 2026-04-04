/**
 * TDD scaffold for OllamaAdapter (Phase 06, Plan 01 — Wave 0)
 *
 * Contracts tested here:
 *   D-11: Ollama HTTP adapter — POST to localhost:11434/api/generate,
 *         ndjson streaming, error handling, AbortSignal cancellation.
 *
 * Implementation target: src/easy-review/cli/OllamaAdapter.ts
 * Created in Plan 06-02 — these tests will be RED until then.
 *
 * Tests use it.todo for cases that require the real implementation.
 * One concrete sanity check verifies the ndjson parsing logic inline
 * so npm run test:unit exits 0 today.
 */

import { afterEach, beforeEach, describe, it, vi } from 'vitest';

// The import below will fail until OllamaAdapter.ts is created in Plan 06-02.
// Stub it now so vitest does not crash with MODULE_NOT_FOUND.
vi.mock('./OllamaAdapter', () => ({
  OllamaAdapter: class {
    async generate(_model: string, _prompt: string, _signal?: AbortSignal): Promise<string> {
      throw new Error('OllamaAdapter not implemented yet (Plan 06-02)');
    }
  },
}));

// Establishing the import contract (Plan 06-02 will create the real module)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { OllamaAdapter } from './OllamaAdapter';

// ---- Inline ndjson parsing sanity check (no VS Code dep, pure logic) ----

function parseNdjsonChunks(ndjson: string): string {
  let result = '';
  for (const line of ndjson.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) { continue; }
    try {
      const obj = JSON.parse(trimmed) as { response?: string; done?: boolean };
      if (typeof obj.response === 'string') {
        result += obj.response;
      }
    } catch {
      // skip malformed lines
    }
  }
  return result;
}

describe('OllamaAdapter', () => {
  // Concrete test — ndjson accumulation logic (pure, no implementation dep)
  it('accumulates ndjson response chunks into a single string', () => {
    const ndjson =
      '{"response":"hello","done":false}\n' +
      '{"response":" world","done":true}\n';
    const result = parseNdjsonChunks(ndjson);
    if (result !== 'hello world') {
      throw new Error(`Expected "hello world" but got "${result}"`);
    }
  });

  it('skips lines without "response" field', () => {
    const ndjson =
      '{"model":"gemma4","done":false}\n' +
      '{"response":"ok","done":true}\n';
    const result = parseNdjsonChunks(ndjson);
    if (result !== 'ok') {
      throw new Error(`Expected "ok" but got "${result}"`);
    }
  });

  // --- Tests deferred until Plan 06-02 creates OllamaAdapter.ts ---

  let savedFetch: typeof globalThis.fetch;
  beforeEach(() => {
    savedFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = savedFetch;
    vi.restoreAllMocks();
  });

  it.todo('POSTs to http://localhost:11434/api/generate with { model, prompt, stream: true }');
  it.todo('accumulates ndjson response chunks via ReadableStream and resolves to full text');
  it.todo('throws Error containing "Ollama HTTP 500" when server responds with HTTP 500');
  it.todo('stops processing chunks after AbortSignal is aborted');
});
