/**
 * contextRequest.ts
 *
 * Pure utility module for parsing the ## CONTEXT_REQUEST header block from
 * per-agent prompt templates. No external dependencies — testable in vitest
 * node environment without VS Code or Node.js built-ins.
 *
 * Per D-14 in 06-CONTEXT.md: agents declare context needs via a structured
 * header block at the top of their prompt template. The orchestrator parses
 * this header before dispatching the sub-agent.
 */

/**
 * Parsed context requirements declared by an agent template.
 */
export interface ContextRequest {
  /** Whether the agent needs the project analysis context from SQLite */
  projectAnalysis: boolean;
  /** Whether the agent needs the commit history from GitHub */
  commitHistory: boolean;
  /** The prompt body (everything after the header separator, or the full template if no header) */
  body: string;
}

/**
 * Regex to match the ## CONTEXT_REQUEST block.
 * Pattern: starts at line beginning with "## CONTEXT_REQUEST",
 * captures the header key-value block, then "---" separator, then the body.
 *
 * From RESEARCH.md Pattern 3.
 */
const CONTEXT_REQUEST_REGEX = /^##\s+CONTEXT_REQUEST\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

/**
 * Parses the ## CONTEXT_REQUEST header from an agent prompt template.
 *
 * If the template starts with a ## CONTEXT_REQUEST block followed by ---,
 * extracts project_analysis and commit_history flags and returns the body.
 * If no header is present, returns defaults (false, false) with the full
 * template as the body.
 *
 * @param template - The full prompt template string
 * @returns Parsed context request with flags and stripped body
 */
export function parseContextRequest(template: string): ContextRequest {
  const match = template.match(CONTEXT_REQUEST_REGEX);

  if (!match) {
    return { projectAnalysis: false, commitHistory: false, body: template };
  }

  const headerBlock = match[1];
  const body = match[2];

  const projectAnalysis = /project_analysis:\s*true/i.test(headerBlock);
  const commitHistory = /commit_history:\s*true/i.test(headerBlock);

  return { projectAnalysis, commitHistory, body };
}
