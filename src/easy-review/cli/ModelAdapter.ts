import type * as vscode from 'vscode';
import type { AgentKey, AIProvider } from '../../shared/types';

/**
 * Common execution interface for all model adapters (D-12).
 * Wraps both CLI subprocess path (Claude, Codex) and HTTP path (Ollama).
 * AgentOrchestrator calls run() regardless of provider type.
 */
export interface ModelRunOpts {
  agentKey: AgentKey;
  prompt: string;
  systemPrompt: string;
  /** AI provider — which backend to use */
  provider: AIProvider;
  /** Actual model identifier for the provider (e.g. "gemma3:4b", "claude-sonnet-4-5") */
  modelId: string;
  onChunk: (text: string) => void;
  abortSignal: AbortSignal;
  token: vscode.CancellationToken;
}

export interface ModelAdapter {
  /** Run a single agent, returning the full accumulated output string. */
  run(opts: ModelRunOpts): Promise<string>;
}
