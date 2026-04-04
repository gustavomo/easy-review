import mermaid from 'mermaid';
import React from 'react';

// D-08: Detect VS Code theme at module init time
// VS Code injects 'vscode-dark', 'vscode-light', or 'vscode-high-contrast' on <body>
const isDark =
  typeof document !== 'undefined' &&
  (document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast'));

// D-05: Initialize mermaid once at module level — NOT inside component (Pitfall 5)
// securityLevel: 'loose' required for CSP with unsafe-eval (D-07)
mermaid.initialize({
  startOnLoad: false,
  theme: isDark ? 'dark' : 'default',
  securityLevel: 'loose',
});

// Pitfall 4 prevention: unique IDs per component instance
let _mermaidCounter = 0;

interface MermaidDiagramProps {
  source: string;
}

/**
 * Renders a Mermaid diagram as an inline SVG (D-05, D-06, POL-01).
 * States: loading → rendered | error (D-09).
 * Uses mermaid.render() async API — initialized once at module level (D-08).
 */
export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Generate ID once per component instance (Pitfall 4)
  const idRef = React.useRef<string>(`mermaid-diagram-${_mermaidCounter++}`);

  React.useEffect(() => {
    if (!source.trim()) {
      setError('No diagram source found.');
      return;
    }

    let active = true;
    setSvg(null);
    setError(null);
    setScale(1);
    setTranslate({ x: 0, y: 0 });

    mermaid
      .render(idRef.current, source)
      .then(({ svg: renderedSvg }) => {
        if (active) setSvg(renderedSvg);
      })
      .catch((err: Error) => {
        if (active) setError(err.message ?? 'Unknown render error');
      });

    return () => {
      active = false;
    };
  }, [source]);

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.25), 4));
  }, []);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
  }, [translate]);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setTranslate({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [dragging]);

  const handleMouseUp = React.useCallback(() => setDragging(false), []);

  const resetView = React.useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // D-09: Render error as styled message — do not crash the section
  if (error) {
    return (
      <div
        style={{
          background: 'var(--vscode-inputValidation-errorBackground)',
          border: '1px solid var(--vscode-inputValidation-errorBorder)',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '12px',
          color: 'var(--vscode-list-errorForeground)',
        }}
      >
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          fontSize: '12px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        Rendering diagram...
      </div>
    );
  }

  const scalePercent = Math.round(scale * 100);

  return (
    <div style={{ position: 'relative' }}>
      {/* Zoom controls */}
      <div style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
      }}>
        <button
          onClick={() => setScale(prev => Math.max(prev - 0.25, 0.25))}
          style={zoomBtnStyle}
          title="Zoom out"
        >-</button>
        <span style={{ minWidth: '40px', textAlign: 'center' }}>{scalePercent}%</span>
        <button
          onClick={() => setScale(prev => Math.min(prev + 0.25, 4))}
          style={zoomBtnStyle}
          title="Zoom in"
        >+</button>
        <button
          onClick={resetView}
          style={{ ...zoomBtnStyle, marginLeft: '4px', width: 'auto', padding: '2px 8px' }}
          title="Reset zoom and position"
        >Reset</button>
      </div>
      {/* Diagram viewport — scroll wheel zooms, drag to pan */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          overflow: 'hidden',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          cursor: dragging ? 'grabbing' : 'grab',
          minHeight: '200px',
          background: 'var(--vscode-editor-background)',
        }}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: dragging ? 'none' : 'transform 0.1s ease-out',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}

const zoomBtnStyle: React.CSSProperties = {
  background: 'var(--vscode-button-secondaryBackground)',
  color: 'var(--vscode-button-secondaryForeground)',
  border: '1px solid var(--vscode-button-border, transparent)',
  borderRadius: '3px',
  width: '24px',
  height: '24px',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
