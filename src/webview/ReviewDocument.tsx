import type { ParsedReview } from '@shared/types';
import { marked } from 'marked';
import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { FindingsSection } from './FindingsSection';

interface ReviewDocumentProps {
  review: ParsedReview;
}

const MERMAID_NOTE = 'Mermaid diagram (visual rendering coming in a future version)';

/** Strip leading/trailing code fences (```mermaid ... ``` or ``` ... ```) from content. */
function stripCodeFences(content: string): string {
  return content.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();
}

/**
 * Complete review — one scrollable document with 6 CollapsibleSection children (D-23).
 * No tabs. All sections start expanded.
 * Mermaid section (D-26): code block + deferral note. Visual rendering is v2 (POL-01).
 */
export function ReviewDocument({ review }: ReviewDocumentProps) {
  return (
    <div style={{ fontFamily: 'var(--vscode-font-family)' }}>
      {review.sections.map((section) => {
        const isFindingsSection = section.title.toLowerCase().includes('finding');
        const isMermaidSection = section.title.toLowerCase().includes('mermaid');

        return (
          <CollapsibleSection key={section.title} title={section.title} defaultExpanded={true}>
            {isFindingsSection ? (
              <FindingsSection findings={section.findings ?? []} />
            ) : isMermaidSection ? (
              <div>
                <pre style={{
                  background: 'var(--vscode-panel-background)',
                  padding: '16px', borderRadius: '4px',
                  fontFamily: 'var(--vscode-editor-font-family, monospace)',
                  fontSize: '12px', lineHeight: '18px',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  color: 'var(--vscode-editor-foreground)',
                }}>
                  {stripCodeFences(section.content ?? '')}
                </pre>
                <p style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: '8px 0 0 0' }}>
                  {MERMAID_NOTE}
                </p>
              </div>
            ) : (
              <div
                className="easy-review-md"
                dangerouslySetInnerHTML={{ __html: marked(section.content ?? '') as string }}
              />
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
