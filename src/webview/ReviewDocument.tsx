import type { ParsedReview } from '@shared/types';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import { CategorizedChangesSection } from './CategorizedChangesSection';
import { CollapsibleSection } from './CollapsibleSection';
import { FindingsSection } from './FindingsSection';
import { ImpactAnalysisSection } from './ImpactAnalysisSection';
import { MermaidDiagram } from './MermaidDiagram';

// D-01/D-02: Configure syntax highlighting globally for all marked() calls
// D-03: Auto-detect language when no tag present (hljs.highlightAuto)
// D-04: Colors applied via CSS vars in webview.css — no theme import
// Pitfall 2 mitigation: use marked-highlight (synchronous path), NOT marked.setOptions({highlight: 3args})
marked.use(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

interface ReviewDocumentProps {
  review: ParsedReview;
}

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
        const isCategorizedSection = section.title.toLowerCase().includes('categorized'); // D-10
        const isImpactSection = section.title.toLowerCase().includes('impact');            // D-14

        return (
          <CollapsibleSection key={section.title} title={section.title} defaultExpanded={true}>
            {isFindingsSection ? (
              <FindingsSection findings={section.findings ?? []} />
            ) : isMermaidSection ? (
              <MermaidDiagram source={stripCodeFences(section.content ?? '')} />
            ) : isCategorizedSection ? (
              <CategorizedChangesSection content={section.content ?? ''} />
            ) : isImpactSection ? (
              <ImpactAnalysisSection content={section.content ?? ''} />
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
