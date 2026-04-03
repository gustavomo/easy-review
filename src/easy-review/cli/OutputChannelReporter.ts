import * as vscode from 'vscode';

const CHANNEL_NAME = 'Easy Review';

let _channel: vscode.OutputChannel | undefined;

/**
 * Returns the shared Easy Review Output Channel, creating it on first call.
 * The channel is shown automatically when CLI output starts streaming (D-13).
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel(CHANNEL_NAME);
  }
  return _channel;
}

/**
 * Dispose the output channel. Call from deactivate().
 */
export function disposeOutputChannel(): void {
  _channel?.dispose();
  _channel = undefined;
}

export class OutputChannelReporter {
  private readonly channel: vscode.OutputChannel;

  constructor() {
    this.channel = getOutputChannel();
  }

  /**
   * Show the channel and begin a new CLI run section.
   */
  beginRun(label: string): void {
    this.channel.show(true); // preserve focus
    this.channel.appendLine(`\n─── ${label} ───`);
  }

  getChannel(): vscode.OutputChannel {
    return this.channel;
  }
}
