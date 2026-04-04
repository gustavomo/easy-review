/**
 * TDD scaffold for AgentOrchestrator (Phase 06, Plan 01 — Wave 0)
 *
 * Contracts tested here:
 *   D-03/D-04/D-05: 7-agent concurrent dispatch, SectionState map,
 *   progressive transitions (pending → complete | error)
 *
 * Implementation target: src/easy-review/agents/AgentOrchestrator.ts
 * Created in Plan 06-05 — these tests will be RED until then.
 *
 * All tests use describe.todo / it.todo so that npm run test:unit exits 0
 * while the implementation does not yet exist.
 */

import { describe, it, vi } from 'vitest';

// The import below will fail at module resolution until Plan 06-05 creates the file.
// Wrapped in a vi.mock factory so vitest does not crash with MODULE_NOT_FOUND.
// The actual test cases are marked .todo until the implementation exists.

vi.mock('./AgentOrchestrator', () => ({
  runAllAgents: async (_opts: unknown) => ({} as Record<string, unknown>),
}));

// Establishing the import contract (Plan 06-05 will create the real module)
// eslint-disable-next-line @typescript-eslint/no-unused-vars, import/extensions, import/no-unresolved
import { runAllAgents } from './AgentOrchestrator';

// Type contract — kept here so future implementors know the expected shapes.
// These types will also be defined in AgentOrchestrator.ts.
type AgentKey =
  | 'prSummarizer'
  | 'bugRisk'
  | 'architectureChange'
  | 'testCoverage'
  | 'documentation'
  | 'diagram'
  | 'businessImpact';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type SectionState =
  | { status: 'pending' }
  | { status: 'generating' }
  | { status: 'complete'; content: string }
  | { status: 'error'; error: string };

const ALL_AGENT_KEYS: AgentKey[] = [
  'prSummarizer',
  'bugRisk',
  'architectureChange',
  'testCoverage',
  'documentation',
  'diagram',
  'businessImpact',
];

describe('AgentOrchestrator', () => {
  // Concrete contract check: type shapes are consistent (no VS Code dep, passes now)
  it('defines the 7 AgentKey values', () => {
    const keys: AgentKey[] = ALL_AGENT_KEYS;
    const expected = [
      'prSummarizer',
      'bugRisk',
      'architectureChange',
      'testCoverage',
      'documentation',
      'diagram',
      'businessImpact',
    ];
    expect(keys).toEqual(expected);
  });

  // The remaining tests are deferred until Plan 06-05 creates AgentOrchestrator.ts
  describe.todo('runAllAgents — dispatches 7 agents concurrently (Plan 06-05)', () => {
    it.todo('returns a Record<AgentKey, SectionState> with keys for all 7 agents');
    it.todo('dispatches all 7 agents — Promise.allSettled receives exactly 7 entries');
    it.todo('initial SectionState for each key is { status: "pending" } before resolution');
    it.todo('on agent completion, SectionState transitions to { status: "complete", content: string }');
    it.todo('on agent error, SectionState transitions to { status: "error", error: string }');
  });
});

// Inline expect (needed because vitest globals: false)
function expect(actual: unknown) {
  return {
    toEqual(expected: unknown) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${a} to equal ${b}`);
      }
    },
  };
}
