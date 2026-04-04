import type { AgentKey, ModelName } from '../../shared/types';
import type * as vscode from 'vscode';

/**
 * Common execution interface for all model adapters (D-12).
 * Wraps both CLI subprocess path (Claude, Codex) and HTTP path (Ollama).
 * AgentOrchestrator calls run() regardless of model type.
 */
export interface ModelRunOpts {
  agentKey: AgentKey;
  prompt: string;
  systemPrompt: string;
  model: ModelName;
  onChunk: (text: string) => void;
  abortSignal: AbortSignal;
  token: vscode.CancellationToken;
}

export interface ModelAdapter {
  /** Run a single agent, returning the full accumulated output string. */
  run(opts: ModelRunOpts): Promise<string>;
}
