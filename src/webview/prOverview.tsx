import ReactDOM from 'react-dom';
import { PROverviewPanel, type StoredPRData } from './PROverviewPanel';

declare function acquireVsCodeApi(): {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const vscode = acquireVsCodeApi();

// Initial render — loading placeholder while waiting for loadPR message
ReactDOM.render(
  <div style={{ padding: '16px', color: 'var(--vscode-editor-foreground)' }}>Loading...</div>,
  document.getElementById('app'),
);

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as { type: string; pr: StoredPRData };
  if (msg.type === 'loadPR') {
    ReactDOM.render(
      <PROverviewPanel pr={msg.pr} vscode={vscode} />,
      document.getElementById('app'),
    );
  }
});

// Signal the extension host that the webview is ready to receive data.
// This replaces the setTimeout(100ms) approach — the extension host sends
// loadPR only after receiving this 'ready' message, guaranteeing the
// message listener above is already registered.
vscode.postMessage({ type: 'ready' });
