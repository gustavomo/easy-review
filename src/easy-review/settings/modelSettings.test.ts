import { describe, expect, it } from 'vitest';
import { migrateActiveModel, resolveAgentModel } from './modelSettings';

describe('resolveAgentModel', () => {
  it('returns per-agent override when present', () => {
    const result = resolveAgentModel({
      agentKey: 'bugRisk',
      agentModels: { bugRisk: 'codex' },
      defaultModel: 'claude',
    });
    expect(result).toBe('codex');
  });

  it('falls back to defaultModel when agentModels is empty', () => {
    const result = resolveAgentModel({
      agentKey: 'testCoverage',
      agentModels: {},
      defaultModel: 'ollama',
    });
    expect(result).toBe('ollama');
  });

  it('falls back to defaultModel when agentModels is undefined', () => {
    const result = resolveAgentModel({
      agentKey: 'diagram',
      agentModels: undefined,
      defaultModel: 'claude',
    });
    expect(result).toBe('claude');
  });
});

describe('migrateActiveModel', () => {
  it('uses activeModel as fallback when defaultModel is unset', () => {
    const result = migrateActiveModel({ activeModel: 'codex', defaultModel: undefined });
    expect(result).toBe('codex');
  });

  it('defaultModel wins over activeModel when both are set', () => {
    const result = migrateActiveModel({ activeModel: 'codex', defaultModel: 'claude' });
    expect(result).toBe('claude');
  });

  it('returns claude as system default when neither is set', () => {
    const result = migrateActiveModel({ activeModel: undefined, defaultModel: undefined });
    expect(result).toBe('claude');
  });
});
