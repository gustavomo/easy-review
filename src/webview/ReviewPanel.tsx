import React, { useState, useEffect } from 'react';
import type { ExtensionMessage, WebviewMessage, WebviewState } from '@shared/types';
import { PanelHeader } from './PanelHeader';
import { IdleView } from './IdleView';
import { StreamingView } from './StreamingView';
import { ErrorView } from './ErrorView';

// ReviewDocument is imported in Plan 06 — use a placeholder until then
// import { ReviewDocument } from './ReviewDocument';

interface ReviewPanelProps {
  vscode: { postMessage(msg: WebviewMessage): void };
}

/**
 * Root component. Owns the 4-state machine: idle | generating | complete | error.
 * State transitions driven by messages from extension host (D-16).
 * Ready handshake: sends 'ready' on mount to trigger stateSync from host (RESEARCH.md Pattern 3).
 */
export function ReviewPanel({ vscode }: ReviewPanelProps) {
  const [state, setState] = useState<WebviewState>({ status: 'idle' });
  const [streamingText, setStreamingText] = useState('');
  const [historyItems, setHistoryItems] = useState<Array<{ id: number; label: string }>>([]);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'stateSync':
          setState(msg.state);
          if (msg.state.status === 'complete') {
            setStreamingText('');
          }
          break;
        case 'startReview':
          setState({ status: 'generating', prTitle: msg.prTitle, model: msg.model, elapsedMs: 0 });
          setStreamingText('');
          break;
        case 'streamChunk':
          setStreamingText(prev => prev + msg.text);
          break;
        case 'reviewComplete':
          setState({ status: 'complete', review: msg.review });
          setStreamingText('');
          break;
        case 'reviewError':
          setState({ status: 'error', message: msg.message });
          setStreamingText('');
          break;
        case 'loadReviewResult':
          setState({ status: 'complete', review: msg.review });
          break;
      }
    };

    window.addEventListener('message', handler);
    // Ready handshake — triggers stateSync from extension host (RESEARCH.md Pattern 3)
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, [vscode]);

  // Determine what to show in the header
  const prTitle = state.status === 'generating' ? state.prTitle
    : state.status === 'complete' ? state.review.sections[0]?.title ?? 'Review'
    : '';
  const modelBadge = state.status === 'generating' ? state.model
    : state.status === 'complete' ? state.review.model
    : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--vscode-editor-background)' }}>
      <PanelHeader
        prTitle={prTitle}
        model={modelBadge}
        isGenerating={state.status === 'generating'}
        historyItems={historyItems}
        onCancel={() => vscode.postMessage({ type: 'cancelReview' })}
        onLoadHistory={(id) => vscode.postMessage({ type: 'loadReview', reviewId: id })}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px' }}>
        {state.status === 'idle' && <IdleView />}
        {state.status === 'generating' && (
          <StreamingView text={streamingText} />
        )}
        {state.status === 'complete' && (
          // Plan 06 will replace this placeholder with <ReviewDocument review={state.review} />
          <div style={{ fontFamily: 'var(--vscode-font-family)', fontSize: '13px', color: 'var(--vscode-editor-foreground)' }}>
            {state.review.sections.map(s => (
              <div key={s.title}>
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{s.title}</h2>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.content}</pre>
              </div>
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <ErrorView message={state.message} onRetry={() => vscode.postMessage({ type: 'retryReview' })} />
        )}
      </div>
    </div>
  );
}
