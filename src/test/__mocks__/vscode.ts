// Minimal vscode API mock for vitest unit tests.
// Only mock what the unit-tested code actually imports.

// Helper to make a mock webview panel
function makeMockWebviewPanel() {
  return {
    webview: {
      html: '',
      postMessage: (_msg: unknown) => Promise.resolve(true),
      onDidReceiveMessage: (_handler: unknown) => ({ dispose: () => {} }),
      asWebviewUri: (uri: unknown) => uri,
      cspSource: 'mock-csp-source',
    },
    title: 'Easy Review',
    reveal: (_column?: unknown, _preserveFocus?: boolean) => {},
    onDidDispose: (_handler: unknown) => ({ dispose: () => {} }),
    onDidChangeViewState: (_handler: unknown) => ({ dispose: () => {} }),
    dispose: () => {},
  };
}

export const window = {
  showErrorMessage: (_msg: string, ..._items: string[]) => Promise.resolve(undefined),
  showWarningMessage: (_msg: string, ..._items: string[]) => Promise.resolve(undefined),
  showInformationMessage: (_msg: string, ..._items: string[]) => Promise.resolve(undefined),
  createOutputChannel: (_name: string) => ({
    append: (_value: string) => {},
    appendLine: (_value: string) => {},
    show: () => {},
    dispose: () => {},
  }),
  createWebviewPanel: (_viewType: string, _title: string, _showOptions: unknown, _options?: unknown) => makeMockWebviewPanel(),
};
export const workspace = {
  getConfiguration: (_section: string) => ({
    get: (_key: string) => undefined,
  }),
};
export const EventEmitter = class {
  private _listeners: ((...args: unknown[]) => void)[] = [];
  event = (listener: (...args: unknown[]) => void) => {
    this._listeners.push(listener);
    return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } };
  };
  fire(data: unknown) {
    for (const l of this._listeners) { l(data); }
  }
  dispose() { this._listeners = []; }
};
export const TreeItem = class {
  constructor(public label: string, public collapsibleState?: number) {}
};
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
export const ThemeIcon = class {
  constructor(public id: string, public color?: unknown) {}
};
export const ThemeColor = class {
  constructor(public id: string) {}
};
export const Uri = {
  parse: (s: string) => {
    // Minimal parse: extract scheme, authority, path, query from URI string
    const match = s.match(/^([^:]+):\/\/([^/?]*)([^?]*)(?:\?(.*))?$/);
    if (match) {
      return {
        scheme: match[1] ?? '',
        authority: match[2] ?? '',
        path: match[3] ?? '',
        query: match[4] ?? '',
        toString: () => s,
      };
    }
    return { scheme: '', authority: '', path: s, query: '', toString: () => s };
  },
  file: (s: string) => {
    const obj: Record<string, unknown> = { fsPath: s, scheme: 'file', authority: '', path: s, query: '', fragment: '', toString: () => `file://${s}` };
    obj.with = (change: Record<string, unknown>) => {
      const next = { ...obj, ...change };
      next.toString = () => `${next.scheme ?? 'file'}://${next.authority ?? ''}${next.path ?? s}${next.query ? '?' + next.query : ''}${next.fragment ? '#' + next.fragment : ''}`;
      next.with = obj.with;
      return next;
    };
    return obj;
  },
  joinPath: (base: { fsPath?: string; path?: string; toString: () => string }, ...paths: string[]) => {
    const basePath = (base as any).fsPath ?? (base as any).path ?? '';
    const joined = [basePath, ...paths].join('/').replace(/\/+/g, '/');
    return { fsPath: joined, scheme: 'file', authority: '', path: joined, query: '', fragment: '', toString: () => `file://${joined}` };
  },
  from: (components: { scheme: string; authority?: string; path?: string; query?: string; fragment?: string }) => {
    const authority = components.authority ?? '';
    const path = components.path ?? '';
    const query = components.query ?? '';
    const fragment = components.fragment ?? '';
    let str = `${components.scheme}://`;
    if (authority) str += authority;
    str += path;
    if (query) str += `?${query}`;
    if (fragment) str += `#${fragment}`;
    return {
      scheme: components.scheme,
      authority,
      path,
      query,
      fragment,
      toString: () => str,
    };
  },
};
export const CancellationTokenSource = class {
  token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
  cancel() { this.token.isCancellationRequested = true; }
  dispose() {}
};
export const Disposable = class {
  constructor(public callOnDispose?: () => void) {}
  dispose() { this.callOnDispose?.(); }
  static from(...disposables: { dispose: () => void }[]) {
    return new Disposable(() => disposables.forEach(d => d.dispose()));
  }
};
export const l10n = {
  t: (message: string, ..._args: unknown[]) => message,
};
export const ViewColumn = { One: 1, Two: 2, Three: 3, Active: -1, Beside: -2 };
export const commands = {
  executeCommand: (_command: string, ..._args: unknown[]) => Promise.resolve(undefined),
  registerCommand: (_command: string, _handler: unknown) => ({ dispose: () => {} }),
};
