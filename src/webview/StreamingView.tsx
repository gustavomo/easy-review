import { useEffect, useRef } from 'react';

interface StreamingViewProps {
  text: string;
}

/**
 * Generating state — auto-scrolling live text area (D-12).
 * Auto-scroll pauses when user scrolls up; resumes when back at bottom.
 * threshold = 50px (user is considered "at bottom" within 50px of scroll end).
 */
export function StreamingView({ text }: StreamingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || userScrolledUp.current) { return; }
    el.scrollTop = el.scrollHeight;
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
      {text || <span style={{ color: 'var(--vscode-descriptionForeground)' }}>Starting generation...</span>}
    </div>
  );
}
