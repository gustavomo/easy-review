import type { AgentKey, ExtensionMessage, SectionState, WebviewMessage, WebviewState } from '@shared/types';
import * as React from 'react';
import { AgentStatusBar } from './AgentStatusBar';
import { ErrorView } from './ErrorView';
import { IdleView } from './IdleView';
import { PanelHeader } from './PanelHeader';
import { convertParsedReviewToSections, ReviewDocument } from './ReviewDocument';
import { StreamingView } from './StreamingView';


interface ReviewPanelProps {
  vscode: { postMessage(msg: WebviewMessage): void };
}

/**
 * Root component. Owns the 4-state machine: idle | generating | complete | error.
 * State transitions driven by messages from extension host (D-16).
 * Ready handshake: sends 'ready' on mount to trigger stateSync from host (RESEARCH.md Pattern 3).
 * sectionUpdate messages progressively fill the 7-slot sections map during generation.
 */
export function ReviewPanel({ vscode }: ReviewPanelProps) {
  const [state, setState] = React.useState<WebviewState>({ status: 'idle' });
  const [streamingText, setStreamingText] = React.useState('');
  const [historyItems] = React.useState<Array<{ id: number; label: string }>>([]);
  const [hasAnalysis, setHasAnalysis] = React.useState(false);
  const [sections, setSections] = React.useState<Partial<Record<AgentKey, SectionState>>>({});

  React.useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'stateSync':
          setState(msg.state);
          setHasAnalysis(msg.hasAnalysis ?? false);
          // Catch up on agent sections if webview loaded after sectionUpdate messages were sent
          if (msg.state.status === 'generating' && msg.state.agentSections) {
            setSections(msg.state.agentSections);
          }
          if (msg.state.status === 'complete') {
            setStreamingText('');
          }
          break;
        case 'startReview':
          setState({ status: 'generating', prTitle: msg.prTitle, model: msg.model, elapsedMs: 0 });
          setStreamingText('');
          setSections({});
          break;
        case 'streamChunk':
          setStreamingText(prev => prev + msg.text);
          break;
        case 'sectionUpdate':
          setSections(prev => ({ ...prev, [msg.agentKey]: msg.state }));
          break;
        case 'reviewComplete':
          setState({ status: 'complete', review: msg.review });
          setStreamingText('');
          setSections({});
          break;
        case 'reviewError':
          setState({ status: 'error', message: msg.message });
          setStreamingText('');
          setSections({});
          break;
        case 'loadReviewResult':
          setState({ status: 'complete', review: msg.review });
          setSections({});
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

  // AgentSummary: progress copy shown beside elapsed counter during generation
  const completedCount = Object.values(sections).filter(s => s?.status === 'complete').length;
  const totalCount = 7;
  const allComplete = completedCount === totalCount;
  const agentSummary = state.status === 'generating'
    ? (allComplete ? 'Review complete' : `${completedCount} of ${totalCount} agents complete`)
    : undefined;

  // For the complete state: use sections map if we have progressive data,
  // otherwise convert the stored ParsedReview to sections format
  const reviewSections = state.status === 'complete'
    ? (Object.keys(sections).length > 0 ? sections : convertParsedReviewToSections(state.review))
    : sections;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--vscode-editor-background)' }}>
      <PanelHeader
        prTitle={prTitle}
        model={modelBadge}
        isGenerating={state.status === 'generating'}
        historyItems={historyItems}
        onCancel={() => vscode.postMessage({ type: 'cancelReview' })}
        onLoadHistory={(id) => vscode.postMessage({ type: 'loadReview', reviewId: id })}
        agentSummary={agentSummary}
      />
      {state.status === 'generating' && (
        <AgentStatusBar sections={sections} />
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 32px' }}>
        {state.status === 'idle' && (
          <IdleView
            onAnalyzeProject={() => vscode.postMessage({ type: 'analyzeProject' })}
            hasAnalysis={hasAnalysis}
            onViewAnalysis={() => vscode.postMessage({ type: 'viewAnalysis' })}
          />
        )}
        {state.status === 'generating' && Object.keys(sections).length > 0 && (
          <ReviewDocument sections={sections} />
        )}
        {state.status === 'generating' && Object.keys(sections).length === 0 && (
          <StreamingView text={streamingText} />
        )}
        {state.status === 'complete' && (
          <ReviewDocument sections={reviewSections} />
        )}
        {state.status === 'error' && (
          <ErrorView message={state.message} onRetry={() => vscode.postMessage({ type: 'retryReview' })} />
        )}
      </div>
    </div>
  );
}
