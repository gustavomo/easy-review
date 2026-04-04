/**
 * AgentOrchestrator.ts
 *
 * 7-agent concurrent dispatch engine for Phase 6 multi-agent PR review pipeline.
 *
 * Architecture:
 * - All 7 agents dispatched concurrently via Promise.allSettled (D-03)
 * - Claude-path agents: ADK query() with permissionMode:'bypassPermissions' (D-06/D-07)
 * - Codex-path agents: ReviewRunner.runReview() + CodexAdapter (D-10)
 * - Ollama-path agents: OllamaAdapter.run() (D-11)
 * - Diagram agent has self-correction retry loop: up to 2 retries (D-16/D-17/D-18)
 * - Lazy context loading: parseContextRequest() determines which context each agent needs
 * - onSectionUpdate callback fires as each agent completes (D-04 progressive rendering)
 *
 * ADK import via require() because:
 * - @anthropic-ai/claude-agent-sdk is ESM-only (sdk.mjs)
 * - esbuild bundles it into CJS at build time (format: 'cjs', not externalized)
 * - Using require() at runtime avoids ERR_REQUIRE_ESM in VS Code Node 20 extension host
 */

import * as vscode from 'vscode';
import type { AgentTemplateOpts } from './agentTypes';
import * as ArchitectureChangeAgent from './ArchitectureChangeAgent';
import * as BugRiskAgent from './BugRiskAgent';
import * as BusinessImpactAgent from './BusinessImpactAgent';
import { parseContextRequest } from './contextRequest';
import * as DiagramAgent from './DiagramAgent';
import * as DocumentationAgent from './DocumentationAgent';
import { extractMermaidBlock, validateMermaidSyntax } from './mermaidValidation';
import * as PRSummarizerAgent from './PRSummarizerAgent';
import * as TestCoverageAgent from './TestCoverageAgent';
import type { AgentKey, SectionState } from '../../shared/types';
import { CodexAdapter } from '../cli/CodexAdapter';
import { OllamaAdapter } from '../cli/OllamaAdapter';
import { getOutputChannel } from '../cli/OutputChannelReporter';
import { runReview } from '../cli/ReviewRunner';
import { type ModelConfig, parseModelSpec, resolveAgentSpec } from '../settings/modelSettings';

// Per-agent template module imports

// ADK: require() to avoid ERR_REQUIRE_ESM — esbuild bundles this into CJS at build time
 
const { query } = require('@anthropic-ai/claude-agent-sdk') as typeof import('@anthropic-ai/claude-agent-sdk');

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentModule = {
  getSystemPrompt(): string;
  getTemplate(opts: AgentTemplateOpts): string;
};

const AGENT_ORDER: AgentKey[] = [
  'prSummarizer',
  'bugRisk',
  'architectureChange',
  'testCoverage',
  'documentation',
  'diagram',
  'businessImpact',
];

const AGENT_MAP: Record<AgentKey, AgentModule> = {
  prSummarizer: PRSummarizerAgent,
  bugRisk: BugRiskAgent,
  architectureChange: ArchitectureChangeAgent,
  testCoverage: TestCoverageAgent,
  documentation: DocumentationAgent,
  diagram: DiagramAgent,
  businessImpact: BusinessImpactAgent,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface OrchestratorOpts {
  /** Full PR diff text (unified diff format) */
  diff: string;
  /** Newline-separated list of changed files */
  fileList: string;
  /** Resolved model config (defaultModel + per-agent overrides) */
  modelConfig: ModelConfig;
  /** Absolute path to the claude CLI executable */
  claudePath: string;
  /** Absolute path to the codex CLI executable */
  codexPath: string;
  /** Project analysis from SQLite — passed when any agent declares project_analysis: true */
  projectAnalysis?: string;
  /** Commit history from GitHub — passed when any agent declares commit_history: true */
  commitHistory?: string;
  /** VS Code cancellation token — cancels all agent subprocesses on request */
  token: vscode.CancellationToken;
  /** Called for each agent state transition (pending→generating→complete|error) */
  onSectionUpdate: (agentKey: AgentKey, state: SectionState) => void;
}

export interface OrchestratorResult {
  sections: Record<AgentKey, SectionState>;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Dispatches all 7 review agents concurrently and returns the final section map.
 *
 * Uses Promise.allSettled so individual agent failures do not abort the pipeline.
 * Each agent fires onSectionUpdate as it transitions through pending → generating → complete|error.
 */
export async function runAllAgents(opts: OrchestratorOpts): Promise<OrchestratorResult> {
  const ch = getOutputChannel();
  ch.appendLine(`[AgentOrchestrator] Starting 7-agent concurrent dispatch`);
  ch.appendLine(`[AgentOrchestrator] defaultSpec=${opts.modelConfig.defaultSpec}`);

  // Shared AbortController — all ADK/Ollama agents share this signal
  const controller = new AbortController();
  const cancelDisposable = opts.token.onCancellationRequested(() => {
    ch.appendLine('[AgentOrchestrator] Cancellation requested — aborting all agents');
    controller.abort();
  });

  // Initialize all sections to pending
  const sections: Record<AgentKey, SectionState> = {} as Record<AgentKey, SectionState>;
  for (const agentKey of AGENT_ORDER) {
    sections[agentKey] = { status: 'pending' };
  }

  // Dispatch all 7 agents concurrently
  const agentPromises = AGENT_ORDER.map((agentKey) =>
    runSingleAgent(agentKey, opts, controller.signal, sections, ch),
  );

  const results = await Promise.allSettled(agentPromises);

  cancelDisposable.dispose();

  // Build final section map from settled results
  // (sections are updated in-place by runSingleAgent via onSectionUpdate,
  //  but we rebuild the final map here for clarity)
  for (let i = 0; i < AGENT_ORDER.length; i++) {
    const agentKey = AGENT_ORDER[i];
    const result = results[i];
    if (result.status === 'rejected') {
      // runSingleAgent should have already called onSectionUpdate with error,
      // but guard against any uncaught rejections
      if (sections[agentKey].status !== 'error') {
        const errorMsg = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        sections[agentKey] = { status: 'error', error: errorMsg };
        opts.onSectionUpdate(agentKey, sections[agentKey]);
      }
    }
  }

  ch.appendLine(`[AgentOrchestrator] All 7 agents settled`);
  return { sections };
}

// ─── Single agent runner ───────────────────────────────────────────────────────

async function runSingleAgent(
  agentKey: AgentKey,
  opts: OrchestratorOpts,
  abortSignal: AbortSignal,
  sections: Record<AgentKey, SectionState>,
  ch: vscode.OutputChannel,
): Promise<void> {
  const agentModule = AGENT_MAP[agentKey];
  const spec = resolveAgentSpec({
    agentKey,
    agentSpecs: opts.modelConfig.agentSpecs,
    defaultSpec: opts.modelConfig.defaultSpec,
  });
  const { provider, modelId } = parseModelSpec(spec);

  ch.appendLine(`[AgentOrchestrator] Dispatching agent=${agentKey} spec=${spec}`);

  // Signal generating state
  sections[agentKey] = { status: 'generating' };
  opts.onSectionUpdate(agentKey, sections[agentKey]);

  try {
    // Build template opts (diff + fileList always present)
    const baseOpts: AgentTemplateOpts = {
      diff: opts.diff,
      fileList: opts.fileList,
    };

    // Parse context request to get the stripped body and context flags
    // We must get the full template first to check the CONTEXT_REQUEST header
    const fullTemplate = agentModule.getTemplate(baseOpts);
    const contextReq = parseContextRequest(fullTemplate);

    // Re-build with context injected if needed
    const templateOpts: AgentTemplateOpts = {
      diff: opts.diff,
      fileList: opts.fileList,
      projectAnalysis: contextReq.projectAnalysis ? opts.projectAnalysis : undefined,
      commitHistory: contextReq.commitHistory ? opts.commitHistory : undefined,
    };

    // Build the final prompt: system prompt is separate, user prompt is the template body
    const systemPrompt = agentModule.getSystemPrompt();
    // Get template with real context injected, then re-parse to get stripped body
    const finalTemplate = agentModule.getTemplate(templateOpts);
    const finalContextReq = parseContextRequest(finalTemplate);
    const prompt = finalContextReq.body;

    let result: string;

    if (provider === 'claude') {
      result = await runClaudeAgent(agentKey, prompt, systemPrompt, opts.claudePath, abortSignal, ch);
    } else if (provider === 'codex') {
      result = await runCodexAgent(agentKey, prompt, systemPrompt, opts.codexPath, opts.token, ch);
    } else {
      result = await runOllamaAgent(agentKey, prompt, systemPrompt, modelId, abortSignal, opts.token, ch);
    }

    // For diagram agent: validate Mermaid syntax with up to 2 correction retries
    if (agentKey === 'diagram') {
      result = await runDiagramWithRetry(
        result,
        prompt,
        systemPrompt,
        provider,
        modelId,
        opts,
        abortSignal,
        ch,
      );
    }

    sections[agentKey] = { status: 'complete', content: result };
    opts.onSectionUpdate(agentKey, sections[agentKey]);
    ch.appendLine(`[AgentOrchestrator] Agent completed: ${agentKey} (${result.length} chars)`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    ch.appendLine(`[AgentOrchestrator] Agent failed: ${agentKey} — ${errorMsg}`);
    sections[agentKey] = { status: 'error', error: errorMsg };
    opts.onSectionUpdate(agentKey, sections[agentKey]);
  }
}

// ─── Model-path runners ───────────────────────────────────────────────────────

async function runClaudeAgent(
  agentKey: AgentKey,
  prompt: string,
  systemPrompt: string,
  claudePath: string,
  abortSignal: AbortSignal,
  ch: vscode.OutputChannel,
): Promise<string> {
  ch.appendLine(`[AgentOrchestrator] Claude ADK query: agent=${agentKey}`);
  const controller = new AbortController();

  // Wire external abort signal into our controller
  abortSignal.addEventListener('abort', () => controller.abort());

  let result = '';
  for await (const message of query({
    prompt,
    options: {
      systemPrompt,
      maxTurns: 1,
      allowedTools: [],
      permissionMode: 'bypassPermissions',
      pathToClaudeCodeExecutable: claudePath,
      abortController: controller,
    },
  })) {
    const maybeResult = (message as { result?: string }).result;
    if (maybeResult !== undefined) {
      result = maybeResult;
    }
  }

  return result;
}

async function runCodexAgent(
  agentKey: AgentKey,
  prompt: string,
  systemPrompt: string,
  codexPath: string,
  token: vscode.CancellationToken,
  ch: vscode.OutputChannel,
): Promise<string> {
  ch.appendLine(`[AgentOrchestrator] Codex ReviewRunner: agent=${agentKey}`);
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
  return runReview(codexPath, new CodexAdapter(), {
    prompt: fullPrompt,
    token,
    onChunk: () => {},
  });
}

async function runOllamaAgent(
  agentKey: AgentKey,
  prompt: string,
  systemPrompt: string,
  ollamaModel: string,
  abortSignal: AbortSignal,
  token: vscode.CancellationToken,
  ch: vscode.OutputChannel,
): Promise<string> {
  ch.appendLine(`[AgentOrchestrator] OllamaAdapter: agent=${agentKey} model=${ollamaModel}`);
  return new OllamaAdapter().run({
    agentKey,
    prompt,
    systemPrompt,
    provider: 'ollama',
    modelId: ollamaModel,
    onChunk: () => {},
    abortSignal,
    token,
  });
}

// ─── Mermaid self-correction retry loop ───────────────────────────────────────

const MAX_MERMAID_RETRIES = 2;

async function runDiagramWithRetry(
  initialResult: string,
  originalPrompt: string,
  systemPrompt: string,
  provider: 'claude' | 'codex' | 'ollama',
  modelId: string,
  opts: OrchestratorOpts,
  abortSignal: AbortSignal,
  ch: vscode.OutputChannel,
): Promise<string> {
  let result = initialResult;

  for (let attempt = 0; attempt < MAX_MERMAID_RETRIES; attempt++) {
    const mermaidSource = extractMermaidBlock(result) ?? result;
    const validation = validateMermaidSyntax(mermaidSource);

    if (validation.valid) {
      ch.appendLine(`[AgentOrchestrator] Diagram valid on attempt ${attempt}`);
      return result;
    }

    ch.appendLine(`[AgentOrchestrator] Diagram invalid (attempt ${attempt + 1}/${MAX_MERMAID_RETRIES}): ${validation.error}`);

    // Build correction prompt
    const correctionPrompt =
      originalPrompt +
      '\n\nPrevious output was invalid:\n' +
      result +
      '\nError: ' +
      (validation.error ?? 'Unknown Mermaid syntax error') +
      '\n\nPlease produce valid Mermaid syntax starting with a recognized type keyword.';

    try {
      if (provider === 'claude') {
        result = await runClaudeAgent('diagram', correctionPrompt, systemPrompt, opts.claudePath, abortSignal, ch);
      } else if (provider === 'codex') {
        result = await runCodexAgent('diagram', correctionPrompt, systemPrompt, opts.codexPath, opts.token, ch);
      } else {
        result = await runOllamaAgent('diagram', correctionPrompt, systemPrompt, modelId, abortSignal, opts.token, ch);
      }
    } catch (err) {
      ch.appendLine(`[AgentOrchestrator] Diagram correction attempt ${attempt + 1} failed: ${err}`);
      // Return whatever we had before the retry failed
      return result;
    }
  }

  // After MAX_MERMAID_RETRIES failures, validate one final time
  const finalSource = extractMermaidBlock(result) ?? result;
  const finalValidation = validateMermaidSyntax(finalSource);
  if (!finalValidation.valid) {
    ch.appendLine(`[AgentOrchestrator] Diagram still invalid after ${MAX_MERMAID_RETRIES} retries — returning raw output`);
  }

  return result;
}
