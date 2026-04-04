import type { AgentKey, AIProvider } from '../../shared/types';

export interface ModelConfig {
  /** Which AI provider to use by default ('claude' | 'codex' | 'ollama') */
  defaultProvider: AIProvider;
  /** Per-agent provider overrides */
  agentModels?: Partial<Record<AgentKey, AIProvider>>;
  /** Actual Ollama model name (e.g. 'gemma3:4b', 'llama3.2', 'mistral') */
  ollamaModel: string;
  /** @deprecated use defaultProvider instead (D-21 migration) */
  activeModel?: string;
}

/**
 * Resolve the provider to use for a specific agent.
 * Per-agent override (agentModels[agentKey]) wins over defaultProvider.
 */
export function resolveAgentProvider(opts: {
  agentKey: AgentKey;
  agentModels?: Partial<Record<AgentKey, AIProvider>>;
  defaultProvider: AIProvider;
}): AIProvider {
  return opts.agentModels?.[opts.agentKey] ?? opts.defaultProvider;
}

/** @deprecated Use resolveAgentProvider */
export function resolveAgentModel(opts: {
  agentKey: AgentKey;
  agentModels?: Partial<Record<AgentKey, AIProvider>>;
  defaultModel: AIProvider;
}): AIProvider {
  return resolveAgentProvider({ ...opts, defaultProvider: opts.defaultModel });
}

/**
 * D-21: Migration from easyReview.activeModel to easyReview.defaultModel.
 * If defaultModel is set, use it. Otherwise fall back to activeModel.
 * If neither is set, return 'claude' as the system default.
 */
export function migrateActiveModel(opts: {
  activeModel?: string;
  defaultModel?: string;
}): AIProvider {
  const valid: AIProvider[] = ['claude', 'codex', 'ollama'];
  if (opts.defaultModel && valid.includes(opts.defaultModel as AIProvider)) {
    return opts.defaultModel as AIProvider;
  }
  if (opts.activeModel && valid.includes(opts.activeModel as AIProvider)) {
    return opts.activeModel as AIProvider;
  }
  return 'claude';
}

/**
 * Read model config from VS Code workspace configuration.
 * Handles D-21 migration: reads activeModel as fallback if defaultModel unset.
 */
export function readModelConfig(config: {
  get<T>(key: string, defaultValue?: T): T;
}): ModelConfig {
  const defaultProvider = migrateActiveModel({
    activeModel: config.get<string>('activeModel'),
    defaultModel: config.get<string>('defaultModel'),
  });
  const agentModels = config.get<Partial<Record<AgentKey, AIProvider>>>('agentModels', {} as Partial<Record<AgentKey, AIProvider>>);
  const ollamaModel = config.get<string>('ollamaModel', 'gemma3:4b');
  return { defaultProvider, agentModels, ollamaModel };
}
