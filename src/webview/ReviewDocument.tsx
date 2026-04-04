import type { AgentKey, ParsedReview, SectionState } from '@shared/types';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

import { CategorizedChangesSection } from './CategorizedChangesSection';
import { CollapsibleSection } from './CollapsibleSection';
import { DiagramErrorBanner } from './DiagramErrorBanner';
import { FindingsSection } from './FindingsSection';
import { ImpactAnalysisSection } from './ImpactAnalysisSection';
import { MermaidDiagram } from './MermaidDiagram';
import { SectionPendingPlaceholder } from './SectionPendingPlaceholder';
import { parseFindingsSection } from '../easy-review/cli/ReviewParser';

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

export interface ReviewDocumentProps {
  sections: Partial<Record<AgentKey, SectionState>>;
}

/** Ordered list of all 7 agent keys — controls section display order (D-20). */
const AGENT_ORDER: AgentKey[] = [
  'prSummarizer',
  'bugRisk',
  'architectureChange',
  'testCoverage',
  'documentation',
  'diagram',
  'businessImpact',
];

/** Display title for each agent section. */
const SECTION_TITLES: Record<AgentKey, string> = {
  prSummarizer: 'PR Summary',
  bugRisk: 'Bug & Risk Analysis',
  architectureChange: 'Architecture Changes',
  testCoverage: 'Test Coverage',
  documentation: 'Documentation Review',
  diagram: 'Visual Overview',
  businessImpact: 'Business Impact',
};

/** Strip leading/trailing code fences (```mermaid ... ``` or ``` ... ```) from content. */
function stripCodeFences(content: string): string {
  // Extract content from a ```mermaid ... ``` block anywhere in the string.
  // The end-anchor approach breaks when the model appends commentary after the fence.
  const mermaidMatch = content.match(/```mermaid\s*\r?\n([\s\S]*?)```/);
  if (mermaidMatch) {
    return mermaidMatch[1].trim();
  }
  // Fallback: strip opening fence only (legacy path)
  return content.replace(/^```[a-z]*\r?\n?/i, '').replace(/\r?\n?```\s*$/i, '').trim();
}

/**
 * Convert a stored ParsedReview (6-section legacy format) into the 7-slot sections map
 * used by the progressive rendering pipeline (D-04, D-05).
 *
 * Matches section titles to AgentKey via the same keyword rules as the section renderer.
 * Unmatched sections are mapped to the closest key or skipped.
 */
export function convertParsedReviewToSections(
  review: ParsedReview
): Partial<Record<AgentKey, SectionState>> {
  const result: Partial<Record<AgentKey, SectionState>> = {};

  for (const section of review.sections) {
    const titleLower = section.title.toLowerCase();
    const content = section.content ?? '';

    let key: AgentKey | null = null;

    if (titleLower.includes('bug') || titleLower.includes('risk') || titleLower.includes('finding')) {
      key = 'bugRisk';
    } else if (titleLower.includes('architecture')) {
      key = 'architectureChange';
    } else if (titleLower.includes('visual') || titleLower.includes('mermaid') || content.trimStart().startsWith('```mermaid')) {
      key = 'diagram';
    } else if (titleLower.includes('business') || titleLower.includes('impact')) {
      key = 'businessImpact';
    } else if (titleLower.includes('test')) {
      key = 'testCoverage';
    } else if (titleLower.includes('doc')) {
      key = 'documentation';
    } else if (titleLower.includes('summary') || titleLower.includes('pr') || titleLower.includes('overview') || titleLower.includes('review')) {
      key = 'prSummarizer';
    }

    if (key && !result[key]) {
      result[key] = { status: 'complete', content };
    }
  }

  return result;
}

/**
 * Progressive review document — renders 7 sections in AGENT_ORDER.
 * Sections not yet complete show SectionPendingPlaceholder.
 * Sections with status=complete render the appropriate section-specific component.
 * Users can read finished sections while others still show spinners (D-04).
 */
export function ReviewDocument({ sections }: ReviewDocumentProps) {
  return (
    <div style={{ fontFamily: 'var(--vscode-font-family)' }}>
      {AGENT_ORDER.map((agentKey) => {
        const state = sections[agentKey] ?? { status: 'pending' as const };
        const title = SECTION_TITLES[agentKey];

        if (state.status === 'pending' || state.status === 'generating') {
          const isValidating = agentKey === 'diagram' && state.status === 'generating';
          return (
            <CollapsibleSection key={agentKey} title={title} defaultExpanded={true}>
              <SectionPendingPlaceholder copy={isValidating ? 'Validating diagram...' : undefined} />
            </CollapsibleSection>
          );
        }

        if (state.status === 'error') {
          return (
            <CollapsibleSection key={agentKey} title={title} defaultExpanded={true}>
              <div style={{ color: 'var(--vscode-list-errorForeground)', padding: '8px 0', fontSize: '13px' }}>
                Agent failed: {state.error}
              </div>
            </CollapsibleSection>
          );
        }

        // status === 'complete'
        const content = state.content ?? '';
        const titleLower = title.toLowerCase();
        const isBugRiskSection = titleLower.includes('bug') || titleLower.includes('risk');
        const isArchSection = titleLower.includes('architecture');
        // Specificity: check isMermaidSection before isBusinessSection
        const isMermaidSection =
          titleLower.includes('visual') ||
          titleLower.includes('mermaid') ||
          content.trimStart().startsWith('```mermaid');
        const isBusinessSection = titleLower.includes('business') || titleLower.includes('impact');

        let sectionContent: JSX.Element;

        if (isBugRiskSection) {
          const findings = parseFindingsSection(content);
          sectionContent = <FindingsSection findings={findings} />;
        } else if (isArchSection) {
          sectionContent = <CategorizedChangesSection content={content} />;
        } else if (isMermaidSection) {
          const hasDiagramFailure = content.includes('\u26a0\ufe0f diagram failed');
          if (hasDiagramFailure) {
            sectionContent = (
              <>
                <DiagramErrorBanner />
                <pre><code>{content}</code></pre>
              </>
            );
          } else {
            sectionContent = <MermaidDiagram source={stripCodeFences(content)} />;
          }
        } else if (isBusinessSection) {
          sectionContent = <ImpactAnalysisSection content={content} />;
        } else {
          sectionContent = (
            <div
              className="easy-review-md"
              dangerouslySetInnerHTML={{ __html: marked(content) as string }}
            />
          );
        }

        return (
          <CollapsibleSection key={agentKey} title={title} defaultExpanded={true}>
            {sectionContent}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
