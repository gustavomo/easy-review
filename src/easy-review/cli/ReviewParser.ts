import type { Finding, ReviewSection } from '../../shared/types';

/**
 * Splits raw Claude/Codex CLI output into 6 ReviewSection objects.
 * Splits on ## H2 markdown headings (case-insensitive).
 * Fallback: if no ## headings found, returns single section with title "Review".
 *
 * Per RESEARCH.md Pitfall 2: LLM output is non-deterministic.
 * Always falls back gracefully rather than throwing.
 */
export function parseReview(rawText: string): ReviewSection[] {
  const sectionRegex = /^##\s+(.+)$/gmi;
  const sections: ReviewSection[] = [];
  let lastIndex = 0;
  let lastTitle = '';

  for (const match of rawText.matchAll(sectionRegex)) {
    if (lastTitle) {
      const content = rawText.slice(lastIndex, match.index).trim();
      sections.push(buildSection(lastTitle, content));
    }
    lastTitle = match[1].trim();
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  if (lastTitle) {
    const content = rawText.slice(lastIndex).trim();
    sections.push(buildSection(lastTitle, content));
  }

  // Fallback: no sections found
  if (sections.length === 0) {
    return [{ title: 'Review', content: rawText.trim() }];
  }

  return sections;
}

function buildSection(title: string, content: string): ReviewSection {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle === 'findings' || normalizedTitle.includes('finding')) {
    return { title, content, findings: parseFindingsSection(content) };
  }
  return { title, content };
}

/**
 * Parses the Findings section body into Finding[].
 * Detects severity markers: [critical], [warning], [suggestion] (case-insensitive).
 * Lines without a severity marker are grouped with the previous finding.
 */
export function parseFindingsSection(content: string): Finding[] {
  const findings: Finding[] = [];
  const severityRegex = /^\[(critical|warning|suggestion)\]\s*/i;
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { continue; }
    const match = trimmed.match(severityRegex);
    if (match) {
      findings.push({
        severity: match[1].toLowerCase() as Finding['severity'],
        body: trimmed.slice(match[0].length).trim(),
      });
    } else if (findings.length > 0) {
      // Continuation line — append to previous finding body
      findings[findings.length - 1].body += ' ' + trimmed;
    }
  }

  return findings;
}
