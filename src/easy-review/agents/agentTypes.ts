/**
 * agentTypes.ts
 *
 * Shared types for the per-agent prompt template system.
 * Imported by all 7 agent template files.
 */

/**
 * Options passed to each agent's getTemplate() function.
 * The orchestrator populates these based on the agent's CONTEXT_REQUEST header.
 */
export interface AgentTemplateOpts {
  /** Full PR diff text (unified diff format) */
  diff: string;
  /** Newline-separated list of changed files */
  fileList: string;
  /** Project analysis from SQLite — injected when agent declares project_analysis: true */
  projectAnalysis?: string;
  /** Commit history from GitHub — injected when agent declares commit_history: true */
  commitHistory?: string;
}
