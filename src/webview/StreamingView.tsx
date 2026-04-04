import { useEffect, useRef, useState } from 'react';

interface StreamingViewProps {
  text: string;
}

const STEPS = ['Analyzing PR', 'Analyzing PR.', 'Analyzing PR..', 'Analyzing PR...'];

/**
 * Generating state — auto-scrolling live text area (D-12).
 * Auto-scroll pauses when user scrolls up; resumes when back at bottom.
 * threshold = 50px (user is considered "at bottom" within 50px of scroll end).
 * When text is empty (e.g. codex which doesn't stream), shows an animated
 * waiting indicator so the panel doesn't look frozen.
 */
export function StreamingView({ text }: StreamingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const [dotStep, setDotStep] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || userScrolledUp.current) { return; }
    el.scrollTop = el.scrollHeight;
  }, [text]);

  // Animate the waiting indicator only when there's no streaming text yet
  useEffect(() => {
    if (text) { return; }
    const id = setInterval(() => setDotStep(s => (s + 1) % STEPS.length), 500);
    return () => clearInterval(id);
  }, [text]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) { return; }
    const threshold = 50;
    const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - threshold;
    userScrolledUp.current = !atBottom;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        overflow: 'auto',
        height: '70vh',
        background: 'var(--vscode-panel-background)',
        padding: '16px',
        borderRadius: '4px',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '13px',
        lineHeight: '18px',
        color: 'var(--vscode-editor-foreground)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text || (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          color: 'var(--vscode-descriptionForeground)',
          paddingTop: '8px',
        }}>
          <span className="codicon codicon-loading codicon-modifier-spin" aria-hidden="true" />
          <span>{STEPS[dotStep]}</span>
        </div>
      )}
    </div>
  );
}
