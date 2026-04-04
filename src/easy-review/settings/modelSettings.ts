import type { AgentKey, AIProvider } from '../../shared/types';

/**
 * A model spec combines provider and model ID: "{provider}:{modelId}"
 * Examples: "claude:claude-sonnet-4-6", "ollama:gemma3:4b", "codex:o4-mini"
 * Legacy values (just "claude", "codex", "ollama") are also accepted.
 */
export type ModelSpec = string;

export interface ModelConfig {
  /** Combined spec for the default model, e.g. "claude:claude-sonnet-4-6" */
  defaultSpec: ModelSpec;
  /** Per-agent overrides, same "provider:modelId" format */
  agentSpecs: Partial<Record<AgentKey, ModelSpec>>;
}

/** Parsed form of a ModelSpec */
export interface ParsedModelSpec {
  provider: AIProvider;
  modelId: string;
}

const PROVIDER_DEFAULTS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-6',
  codex: 'o4-mini',
  ollama: 'gemma3:4b',
};

/**
 * Parse a "provider:modelId" spec string.
 * Handles legacy bare-provider values ("claude", "codex", "ollama").
 */
export function parseModelSpec(spec: string): ParsedModelSpec {
  const providers: AIProvider[] = ['claude', 'codex', 'ollama'];

  for (const p of providers) {
    if (spec.startsWith(p + ':')) {
      return { provider: p, modelId: spec.slice(p.length + 1) };
    }
  }

  // Legacy: bare provider name
  if (providers.includes(spec as AIProvider)) {
    const provider = spec as AIProvider;
    return { provider, modelId: PROVIDER_DEFAULTS[provider] };
  }

  // Fallback
  return { provider: 'claude', modelId: PROVIDER_DEFAULTS.claude };
}

/**
 * Resolve the model spec to use for a specific agent.
 * Per-agent override wins over the default.
 */
export function resolveAgentSpec(opts: {
  agentKey: AgentKey;
  agentSpecs: Partial<Record<AgentKey, ModelSpec>>;
  defaultSpec: ModelSpec;
}): ModelSpec {
  return opts.agentSpecs[opts.agentKey] ?? opts.defaultSpec;
}

/**
 * Read model config from VS Code workspace configuration.
 *
 * Primary path: reads easyReview.provider + easyReview.{provider}Model
 * and composes into a "provider:modelId" spec.
 *
 * Legacy fallback: easyReview.defaultModel (combined spec) and
 * easyReview.activeModel (bare provider name) are still accepted.
 */
export function readModelConfig(config: {
  get<T>(key: string, defaultValue?: T): T;
}): ModelConfig {
  const provider = config.get<string>('provider', '') as AIProvider;
  const validProviders: AIProvider[] = ['claude', 'codex', 'ollama'];

  let defaultSpec: ModelSpec;

  if (validProviders.includes(provider)) {
    // New path: provider + per-provider model setting
    const modelMap: Record<AIProvider, string> = {
      claude: config.get<string>('claudeModel', 'claude-sonnet-4-6'),
      codex: config.get<string>('codexModel', 'o4-mini'),
      ollama: config.get<string>('ollamaModel', 'gemma3:12b'),
    };
    defaultSpec = `${provider}:${modelMap[provider]}`;
  } else {
    // Legacy fallback: easyReview.defaultModel or easyReview.activeModel
    defaultSpec =
      config.get<string>('defaultModel', '') ||
      config.get<string>('activeModel', '') ||
      'claude:claude-sonnet-4-6';
  }

  const agentSpecs = config.get<Partial<Record<AgentKey, ModelSpec>>>('agentModels', {} as Partial<Record<AgentKey, ModelSpec>>);

  return {
    defaultSpec,
    agentSpecs: agentSpecs ?? {},
  };
}

/** @deprecated use parseModelSpec instead */
export function migrateActiveModel(opts: {
  activeModel?: string;
  defaultModel?: string;
}): string {
  return opts.defaultModel || opts.activeModel || 'claude:claude-sonnet-4-6';
}

/** @deprecated use resolveAgentSpec + parseModelSpec */
export function resolveAgentProvider(opts: {
  agentKey: AgentKey;
  agentModels?: Partial<Record<AgentKey, AIProvider>>;
  defaultProvider: AIProvider;
}): AIProvider {
  return opts.agentModels?.[opts.agentKey] ?? opts.defaultProvider;
}

/** @deprecated use resolveAgentSpec + parseModelSpec */
export function resolveAgentModel(opts: {
  agentKey: AgentKey;
  agentModels?: Partial<Record<AgentKey, AIProvider>>;
  defaultModel: AIProvider;
}): AIProvider {
  return resolveAgentProvider({ ...opts, defaultProvider: opts.defaultModel });
}
