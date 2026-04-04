import type { AgentKey, ModelName } from '../../shared/types';

export interface ModelConfig {
  defaultModel: ModelName;
  agentModels?: Partial<Record<AgentKey, ModelName>>;
  /** @deprecated use defaultModel instead (D-21 migration) */
  activeModel?: string;
}

/**
 * Resolve the model to use for a specific agent.
 * Per-agent override (agentModels[agentKey]) wins over defaultModel.
 * D-19/D-20: agentModels keys are AgentKey values.
 */
export function resolveAgentModel(opts: {
  agentKey: AgentKey;
  agentModels?: Partial<Record<AgentKey, ModelName>>;
  defaultModel: ModelName;
}): ModelName {
  return opts.agentModels?.[opts.agentKey] ?? opts.defaultModel;
}

/**
 * D-21: Migration from easyReview.activeModel to easyReview.defaultModel.
 * If defaultModel is set, use it. Otherwise fall back to activeModel.
 * If neither is set, return 'claude' as the system default.
 */
export function migrateActiveModel(opts: {
  activeModel?: string;
  defaultModel?: string;
}): ModelName {
  const valid: ModelName[] = ['claude', 'codex', 'ollama'];
  if (opts.defaultModel && valid.includes(opts.defaultModel as ModelName)) {
    return opts.defaultModel as ModelName;
  }
  if (opts.activeModel && valid.includes(opts.activeModel as ModelName)) {
    return opts.activeModel as ModelName;
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
  const defaultModel = migrateActiveModel({
    activeModel: config.get<string>('activeModel'),
    defaultModel: config.get<string>('defaultModel'),
  });
  const agentModels = config.get<Partial<Record<AgentKey, ModelName>>>('agentModels', {} as Partial<Record<AgentKey, ModelName>>);
  return { defaultModel, agentModels };
}
