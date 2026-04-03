// Minimal vscode API mock for vitest unit tests.
// Only mock what the unit-tested code actually imports.
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
  file: (s: string) => ({ fsPath: s, scheme: 'file', authority: '', path: s, query: '', toString: () => `file://${s}` }),
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
