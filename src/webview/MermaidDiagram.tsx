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

  // Rendered: inline SVG via dangerouslySetInnerHTML (SVG from mermaid is trusted bundle output)
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
