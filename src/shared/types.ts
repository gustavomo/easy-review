/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Shared types between extension host and webview.
// Imported by extension host via relative path and by webview via @shared alias (Vite config).
// Do NOT import vscode or any Node.js-specific modules here -- must be browser-compatible.

// --- Message Protocol ---

/** Messages sent from extension host to webview */
export type ExtensionMessage =
	| { type: 'startReview'; prNumber: number; prTitle: string; model: string }
	| { type: 'streamChunk'; text: string }
	| { type: 'reviewComplete'; review: ParsedReview }
	| { type: 'reviewError'; message: string }
	| { type: 'stateSync'; state: WebviewState; hasAnalysis: boolean; analysisDate?: number }
	| { type: 'loadReviewResult'; review: ParsedReview }
	| { type: 'sectionUpdate'; agentKey: AgentKey; state: SectionState };

/** Messages sent from webview to extension host */
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
	createdAt: number; // Unix timestamp ms
	sections: ReviewSection[];
}

export interface ReviewSection {
	title: string; // e.g. "Executive Summary", "Findings"
	content: string; // raw markdown content for this section
	findings?: Finding[]; // populated only for the Findings section
}

export interface Finding {
	severity: 'critical' | 'warning' | 'suggestion';
	body: string;
}

// --- Webview State Machine ---

/** Four-state machine: idle -> generating -> complete | error (D-16) */
export type WebviewState =
	| { status: 'idle' }
	| { status: 'generating'; prTitle: string; model: string; elapsedMs: number; agentSections?: Record<AgentKey, SectionState> }
	| { status: 'complete'; review: ParsedReview }
	| { status: 'error'; message: string };

// --- Phase 6: Multi-agent pipeline types ---

/** Per D-20: 7 agent keys corresponding to the 7 review sections */
export type AgentKey =
	| 'prSummarizer'
	| 'bugRisk'
	| 'architectureChange'
	| 'testCoverage'
	| 'documentation'
	| 'diagram'
	| 'businessImpact';

/** Per D-05: status for each of the 7 agent slots */
export type SectionStatus = 'pending' | 'generating' | 'complete' | 'error';

export interface SectionState {
	status: SectionStatus;
	content?: string; // populated when status === 'complete'
	error?: string; // populated when status === 'error'
}

/**
 * AI provider -- which backend to route an agent to.
 * This is the provider/platform, not the model name.
 * Each provider has its own model setting:
 *   - claude: uses the claude CLI (model configured via claude settings)
 *   - codex: uses the codex CLI
 *   - ollama: uses Ollama HTTP API, model set via easyReview.ollamaModel
 */
export type AIProvider = 'claude' | 'codex' | 'ollama';

/** @deprecated Use AIProvider instead */
export type ModelName = AIProvider;
