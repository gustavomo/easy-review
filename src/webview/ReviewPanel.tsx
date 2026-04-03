import type { ExtensionMessage, WebviewMessage, WebviewState } from '@shared/types';
import { useEffect, useState } from 'react';
import { ErrorView } from './ErrorView';
import { IdleView } from './IdleView';
import { PanelHeader } from './PanelHeader';
import { ReviewDocument } from './ReviewDocument';
import { StreamingView } from './StreamingView';


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
  const [historyItems] = useState<Array<{ id: number; label: string }>>([]);
  const [hasAnalysis, setHasAnalysis] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'stateSync':
          setState(msg.state);
          setHasAnalysis(msg.hasAnalysis ?? false);
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
        {state.status === 'idle' && (
          <IdleView
            onAnalyzeProject={() => vscode.postMessage({ type: 'analyzeProject' })}
            hasAnalysis={hasAnalysis}
            onViewAnalysis={() => vscode.postMessage({ type: 'viewAnalysis' })}
          />
        )}
        {state.status === 'generating' && (
          <StreamingView text={streamingText} />
        )}
        {state.status === 'complete' && (
          <ReviewDocument review={state.review} />
        )}
        {state.status === 'error' && (
          <ErrorView message={state.message} onRetry={() => vscode.postMessage({ type: 'retryReview' })} />
        )}
      </div>
    </div>
  );
}
