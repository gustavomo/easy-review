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
  event = () => ({ dispose: () => {} });
  fire(_data: unknown) {}
  dispose() {}
};
export const TreeItem = class {
  constructor(public label: string, public collapsibleState?: number) {}
};
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
export const ThemeIcon = class {
  constructor(public id: string) {}
};
export const Uri = {
  parse: (s: string) => ({ toString: () => s }),
  file: (s: string) => ({ fsPath: s, toString: () => s }),
};
export const CancellationTokenSource = class {
  token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };
  cancel() { this.token.isCancellationRequested = true; }
  dispose() {}
};
