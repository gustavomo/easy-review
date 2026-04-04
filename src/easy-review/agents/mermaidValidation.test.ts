import { describe, expect, it } from 'vitest';
import { extractMermaidBlock, MERMAID_DIAGRAM_TYPES, validateMermaidSyntax } from './mermaidValidation';

describe('MERMAID_DIAGRAM_TYPES', () => {
  it('contains the required diagram type keywords', () => {
    expect(MERMAID_DIAGRAM_TYPES).toContain('graph');
    expect(MERMAID_DIAGRAM_TYPES).toContain('flowchart');
    expect(MERMAID_DIAGRAM_TYPES).toContain('sequenceDiagram');
    expect(MERMAID_DIAGRAM_TYPES).toContain('classDiagram');
    expect(MERMAID_DIAGRAM_TYPES).toContain('stateDiagram-v2');
    expect(MERMAID_DIAGRAM_TYPES).toContain('erDiagram');
    expect(MERMAID_DIAGRAM_TYPES).toContain('pie');
    expect(MERMAID_DIAGRAM_TYPES).toContain('gitGraph');
    expect(MERMAID_DIAGRAM_TYPES).toContain('mindmap');
    expect(MERMAID_DIAGRAM_TYPES).toContain('timeline');
    expect(MERMAID_DIAGRAM_TYPES).toContain('xychart-beta');
    expect(MERMAID_DIAGRAM_TYPES).toContain('block-beta');
    expect(MERMAID_DIAGRAM_TYPES).toContain('quadrantChart');
  });
});

describe('validateMermaidSyntax', () => {
  it('returns valid: true for graph diagram', () => {
    const result = validateMermaidSyntax('graph TD\n  A-->B');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid: true for flowchart diagram', () => {
    const result = validateMermaidSyntax('flowchart LR\n  A-->B');
    expect(result.valid).toBe(true);
  });

  it('returns valid: true for sequenceDiagram', () => {
    const result = validateMermaidSyntax('sequenceDiagram\n  A->>B: msg');
    expect(result.valid).toBe(true);
  });

  it('returns valid: true for pie chart', () => {
    const result = validateMermaidSyntax('pie title Pets\n  "Dogs": 45');
    expect(result.valid).toBe(true);
  });

  it('returns valid: true for classDiagram', () => {
    const result = validateMermaidSyntax('classDiagram\n  Animal <|-- Duck');
    expect(result.valid).toBe(true);
  });

  it('returns valid: true for stateDiagram-v2', () => {
    const result = validateMermaidSyntax('stateDiagram-v2\n  [*] --> Still');
    expect(result.valid).toBe(true);
  });

  it('returns valid: false with error for unrecognized diagram type', () => {
    const result = validateMermaidSyntax('invalid stuff here');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Unrecognized diagram type');
  });

  it('error message contains the bad first line', () => {
    const result = validateMermaidSyntax('badtype\nsome content');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('badtype');
  });
});

describe('extractMermaidBlock', () => {
  it('extracts mermaid source from triple-backtick fences', () => {
    const content = 'Some text\n```mermaid\ngraph TD\n  A-->B\n```\nMore text';
    const result = extractMermaidBlock(content);
    expect(result).toBe('graph TD\n  A-->B');
  });

  it('returns null when no mermaid block present', () => {
    const content = 'Some text without any mermaid block';
    const result = extractMermaidBlock(content);
    expect(result).toBeNull();
  });

  it('returns null for non-mermaid code blocks', () => {
    const content = '```typescript\nconst x = 1;\n```';
    const result = extractMermaidBlock(content);
    expect(result).toBeNull();
  });
});
