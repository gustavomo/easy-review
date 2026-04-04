/**
 * mermaidValidation.ts
 *
 * Pure utility module for validating Mermaid diagram syntax in the extension
 * host (Node.js / Electron). The `mermaid` npm package is browser-only (DOM
 * required), so validation uses a lightweight regex check against recognized
 * diagram type keywords. This catches the most common LLM mistakes and is
 * sufficient for the self-correction retry loop in the AgentOrchestrator.
 *
 * Per D-16/D-17 in 06-CONTEXT.md and Pattern 4 in 06-RESEARCH.md.
 * No external dependencies — testable in vitest node environment.
 */

/**
 * All recognized Mermaid diagram type keywords.
 * A valid Mermaid source starts with one of these keywords (case-insensitive).
 * From RESEARCH.md Pattern 4.
 */
export const MERMAID_DIAGRAM_TYPES: string[] = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'gitGraph',
  'mindmap',
  'timeline',
  'xychart-beta',
  'block-beta',
  'quadrantChart',
];

/**
 * Validates Mermaid diagram syntax by checking that the first line starts with
 * a recognized diagram type keyword.
 *
 * @param source - The raw Mermaid diagram source (not the full markdown content)
 * @returns { valid: true } if recognized, { valid: false, error: string } otherwise
 */
export function validateMermaidSyntax(source: string): { valid: boolean; error?: string } {
  const firstLine = source.trim().split('\n')[0].trim();

  const isRecognizedType = MERMAID_DIAGRAM_TYPES.some((type) =>
    firstLine.toLowerCase().startsWith(type.toLowerCase()),
  );

  if (!isRecognizedType) {
    return {
      valid: false,
      error: `Unrecognized diagram type: "${firstLine}". Expected one of: ${MERMAID_DIAGRAM_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Extracts the Mermaid source from a markdown triple-backtick mermaid fence.
 *
 * @param content - The full markdown content that may contain a mermaid block
 * @returns The trimmed Mermaid source string, or null if no mermaid block found
 */
export function extractMermaidBlock(content: string): string | null {
  const match = content.match(/```mermaid\s*\n([\s\S]*?)```/);
  if (!match) {
    return null;
  }
  return match[1].trim();
}
