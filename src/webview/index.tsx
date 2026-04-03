import React from 'react';
import ReactDOM from 'react-dom';
import type { ExtensionMessage, WebviewMessage } from '@shared/types';
import { ReviewPanel } from './ReviewPanel';

// Acquire VS Code API — must be called exactly once in the webview lifetime
declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void;
};
const vscode = acquireVsCodeApi();

function App() {
  return <ReviewPanel vscode={vscode} />;
}

ReactDOM.render(<App />, document.getElementById('app'));
