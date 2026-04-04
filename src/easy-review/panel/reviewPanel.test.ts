import { beforeEach, describe, expect, it, vi } from 'vitest';

// ReviewPanel is a singleton with a VS Code WebviewPanel — we test via its public surface
// using mocked vscode module. The test verifies the correct sequence of calls
// when loadReview() is invoked.

describe('ReviewPanel.loadReview() — UI-01', () => {
  it('loadReview calls panel.reveal, updateState with complete status, and posts loadReviewResult', async () => {
    // Dynamic import so the vscode mock is already in place
    const { ReviewPanel } = await import('./ReviewPanel');
    const vscode = await import('vscode');

    // Create a mock store
    const mockStore = {
      initialize: vi.fn(),
      getPRs: vi.fn(() => []),
      savePR: vi.fn(),
      deletePR: vi.fn(),
      getPR: vi.fn(() => undefined),
      close: vi.fn(),
      getReviews: vi.fn(() => []),
      saveReview: vi.fn(() => 42),
      getProjectAnalysis: vi.fn(() => null),
      saveProjectAnalysis: vi.fn(),
    };

    const mockContext = {
      extensionUri: { fsPath: '/fake', joinPath: () => ({ fsPath: '/fake/path' }) },
      subscriptions: [],
      globalState: { get: vi.fn(), update: vi.fn() },
      globalStorageUri: { fsPath: '/fake/storage' },
    } as any;

    // getOrCreate creates a new panel instance
    const panel = ReviewPanel.getOrCreate(mockContext, mockStore as any);

    const storedReview = {
      id: 7,
      repoId: 'owner/repo',
      prNumber: 42,
      modelUsed: 'claude',
      createdAt: 1234567890,
      reviewText: '## Executive Summary\nGood PR.',
      parsedJson: JSON.stringify([{ title: 'Executive Summary', content: 'Good PR.' }]),
    };

    // Spy on postMessage (internal) — via vscode mock's webview
    const postMessageSpy = vi.fn();
    (panel as any).panel.webview.postMessage = postMessageSpy;
    const revealSpy = vi.fn();
    (panel as any).panel.reveal = revealSpy;

    panel.loadReview(storedReview as any);

    // reveal called first
    expect(revealSpy).toHaveBeenCalledWith(vscode.ViewColumn.Two, false);

    // State set to complete
    const state = (panel as any).currentState;
    expect(state.status).toBe('complete');
    expect(state.review.id).toBe(7);
    expect(state.review.prNumber).toBe(42);
    expect(state.review.repoId).toBe('owner/repo');
    expect(state.review.model).toBe('claude');
    expect(state.review.createdAt).toBe(1234567890);
    expect(state.review.sections).toEqual([{ title: 'Executive Summary', content: 'Good PR.' }]);

    // postMessage called with loadReviewResult
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'loadReviewResult', review: expect.objectContaining({ id: 7 }) })
    );

    // Cleanup singleton
    (ReviewPanel as any).instance = undefined;
  });
});
