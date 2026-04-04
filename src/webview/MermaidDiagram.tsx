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
 * Renders a Mermaid diagram as an inline SVG with a "Preview" button
 * that opens a full-screen modal with zoom/pan controls.
 */
export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const idRef = React.useRef<string>(`mermaid-diagram-${_mermaidCounter++}`);

  React.useEffect(() => {
    if (!source.trim()) {
      setError('No diagram source found.');
      return;
    }

    let active = true;
    setSvg(null);
    setError(null);

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
      <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
        Rendering diagram...
      </div>
    );
  }

  return (
    <div>
      {/* Inline preview — click to open full view */}
      <div
        style={{
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          padding: '16px',
          background: 'var(--vscode-editor-background)',
          maxHeight: '300px',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
        }}
        onClick={() => setShowPreview(true)}
        title="Click to open diagram preview"
      >
        <div dangerouslySetInnerHTML={{ __html: svg }} />
        {/* Fade overlay at bottom to hint there's more */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '48px',
          background: 'linear-gradient(transparent, var(--vscode-editor-background))',
          pointerEvents: 'none',
        }} />
      </div>
      <button
        onClick={() => setShowPreview(true)}
        style={{
          marginTop: '8px',
          background: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: '1px solid var(--vscode-button-border, transparent)',
          borderRadius: '3px',
          padding: '4px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>&#x1F50D;</span> Preview Diagram
      </button>

      {showPreview && (
        <DiagramPreviewModal svg={svg} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

/** Full-screen modal with zoom/pan for diagram inspection. */
function DiagramPreviewModal({ svg, onClose }: { svg: string; onClose: () => void }) {
  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.1), 5));
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

  const scalePercent = Math.round(scale * 100);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'var(--vscode-editor-background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--vscode-editor-foreground)',
          flex: 1,
        }}>
          Diagram Preview
        </span>
        <button onClick={() => setScale(prev => Math.max(prev - 0.25, 0.1))} style={toolbarBtn} title="Zoom out">
          -
        </button>
        <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', minWidth: '40px', textAlign: 'center' }}>
          {scalePercent}%
        </span>
        <button onClick={() => setScale(prev => Math.min(prev + 0.25, 5))} style={toolbarBtn} title="Zoom in">
          +
        </button>
        <button onClick={resetView} style={{ ...toolbarBtn, width: 'auto', padding: '4px 10px' }} title="Reset view">
          Fit
        </button>
        <div style={{ width: '1px', height: '20px', background: 'var(--vscode-panel-border)', margin: '0 4px' }} />
        <button onClick={onClose} style={{ ...toolbarBtn, width: 'auto', padding: '4px 10px' }} title="Close (Esc)">
          Close
        </button>
      </div>

      {/* Diagram viewport */}
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: dragging ? 'grabbing' : 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.1s ease-out',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}

const toolbarBtn: React.CSSProperties = {
  background: 'var(--vscode-button-secondaryBackground)',
  color: 'var(--vscode-button-secondaryForeground)',
  border: '1px solid var(--vscode-button-border, transparent)',
  borderRadius: '3px',
  width: '28px',
  height: '28px',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
