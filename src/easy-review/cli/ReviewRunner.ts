import * as cp from 'child_process';
import * as readline from 'readline';
import type * as vscode from 'vscode';
import type { CLIAdapter } from './ClaudeAdapter';
import { getOutputChannel } from './OutputChannelReporter';

export interface ReviewRunOptions {
  prompt: string;
  token: vscode.CancellationToken;
  onChunk: (text: string) => void; // receives batched text every ~200ms (D-13)
}

/**
 * Runs a CLI subprocess for review generation and streams output to onChunk.
 * Per RESEARCH.md Pattern 1: replaces SubprocessRunner's OutputChannel sink with
 * a batched postMessage callback. Do NOT modify SubprocessRunner.ts.
 *
 * Anti-pattern prevention (Pitfall 7): the 200ms batch interval is ALWAYS cleared
 * in the finally block, with a final flush of any remaining buffered text.
 *
 * @param cliPath  Absolute path to the CLI executable
 * @param adapter  Per-CLI adapter (ClaudeAdapter or CodexAdapter)
 * @param opts     Prompt, cancellation token, and onChunk callback
 * @returns        Full accumulated raw output string (for storage as review_text)
 */
export async function runReview(
  cliPath: string,
  adapter: CLIAdapter,
  opts: ReviewRunOptions,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const args = adapter.buildArgs(opts.prompt);
    const proc = cp.spawn(cliPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let fullOutput = '';
    let buffer = '';
    let settled = false;

    // 200ms batch timer — flush accumulated chunks to onChunk callback (D-13)
    const flushInterval = setInterval(() => {
      if (buffer.length > 0) {
        opts.onChunk(buffer);
        buffer = '';
      }
    }, 200);

    function settle(fn: () => void): void {
      if (settled) { return; }
      settled = true;
      clearInterval(flushInterval);
      // Final flush of any remaining buffered text
      if (buffer.length > 0) {
        opts.onChunk(buffer);
        buffer = '';
      }
      fn();
    }

    const rl = readline.createInterface({ input: proc.stdout! });
    rl.on('line', (line: string) => {
      const text = adapter.extractText(line);
      if (text !== null) {
        fullOutput += text;
        buffer += text;
      }
    });

    // Write prompt to stdin (Claude CLI reads prompt from stdin in --print mode)
    proc.stdin!.write(opts.prompt);
    proc.stdin!.end();

    proc.stderr?.on('data', (chunk: Buffer) => {
      getOutputChannel().appendLine(`[stderr] ${chunk.toString().trim()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        settle(() => resolve(fullOutput));
      } else {
        settle(() => reject(new Error(`CLI process exited with code ${code}`)));
      }
    });

    proc.on('error', (err) => {
      settle(() => reject(err));
    });

    // CancellationToken support (D-04: cancel kills CLI process)
    opts.token.onCancellationRequested(() => {
      proc.kill('SIGTERM');
      settle(() => reject(new Error('Review generation cancelled')));
    });
  });
}
