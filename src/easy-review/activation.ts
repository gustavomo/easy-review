import * as vscode from 'vscode';

/**
 * Called from src/extension.ts activate() hook.
 * All Easy Review feature registration happens here.
 * Phase 1: registers tree view, commands, and CLI subprocess infrastructure.
 */
export function activateEasyReview(context: vscode.ExtensionContext): void {
	// Phase 1 feature registration will be added in subsequent plans.
	// This stub satisfies the build dependency chain.
}

/**
 * Called from src/extension.ts deactivate() hook.
 * Kills all running claude CLI subprocesses registered in context.subscriptions.
 */
export function deactivateEasyReview(): void {
	// Process cleanup handled via context.subscriptions in SubprocessRunner (Plan 01-06).
}
