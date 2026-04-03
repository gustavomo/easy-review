// src/shared/types.ts
// Shared types between extension host and webview.
// Imported by extension host via relative path and by webview via @shared alias (Vite config).
// Do NOT import vscode or any Node.js-specific modules here — must be browser-compatible.

// --- Message Protocol ---

/** Messages sent from extension host → webview */
export type ExtensionMessage =
  | { type: 'startReview'; prNumber: number; prTitle: string; model: string }
  | { type: 'streamChunk'; text: string }
  | { type: 'reviewComplete'; review: ParsedReview }
  | { type: 'reviewError'; message: string }
  | { type: 'stateSync'; state: WebviewState; hasAnalysis: boolean; analysisDate?: number }
  | { type: 'loadReviewResult'; review: ParsedReview };

/** Messages sent from webview → extension host */
export type WebviewMessage =
  | { type: 'ready' }
  | { type: 'cancelReview' }
  | { type: 'retryReview' }
  | { type: 'loadReview'; reviewId: number }
  | { type: 'requestState' }
  | { type: 'analyzeProject' }
  | { type: 'viewAnalysis' };

// --- Review Data ---

export interface ParsedReview {
  id: number;
  prNumber: number;
  repoId: string;
  model: string;
  createdAt: number;   // Unix timestamp ms
  sections: ReviewSection[];
}

export interface ReviewSection {
  title: string;       // e.g. "Executive Summary", "Findings"
  content: string;     // raw markdown content for this section
  findings?: Finding[]; // populated only for the Findings section
}

export interface Finding {
  severity: 'critical' | 'warning' | 'suggestion';
  body: string;
}

// --- Webview State Machine ---

/** Four-state machine: idle → generating → complete | error (D-16) */
export type WebviewState =
  | { status: 'idle' }
  | { status: 'generating'; prTitle: string; model: string; elapsedMs: number }
  | { status: 'complete'; review: ParsedReview }
  | { status: 'error'; message: string };
