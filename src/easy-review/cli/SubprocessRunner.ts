import * as cp from 'child_process';
import * as readline from 'readline';
import * as vscode from 'vscode';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (D-14)

export interface RunOptions {
  prompt: string;
  token: vscode.CancellationToken;
  outputChannel: vscode.OutputChannel;
}

/**
 * Spawns the claude CLI in streaming mode and pipes output to an OutputChannel.
 *
 * Claude CLI flags (verified against claude 2.1.87):
 *   --print (-p): non-interactive, required for subprocess use
 *   --output-format stream-json: newline-delimited JSON events to stdout
 *   --include-partial-messages: include partial chunks as they arrive
 *
 * Events from stdout: {type: 'text', text: '...'} | {type: 'result', result: '...'}
 * Non-JSON lines are appended raw (e.g., progress info).
 *
 * Cancellation and hard timeout both kill the process with SIGTERM (D-14).
 *
 * @returns The full accumulated output text on success.
 */
export function runClaudeStreaming(
  claudePath: string,
  opts: RunOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = cp.spawn(
      claudePath,
      ['--print', '--output-format', 'stream-json', '--include-partial-messages'],
      { stdio: ['pipe', 'pipe', 'pipe'] }
    );

    let fullOutput = '';
    let settled = false;

    const settle = (fn: () => void) => {
      if (!settled) { settled = true; clearTimeout(timer); fn(); }
    };

    const rl = readline.createInterface({ input: proc.stdout! });

    rl.on('line', (line) => {
      try {
        const event = JSON.parse(line);
        const text = event.text ?? event.result ?? '';
        if (text) {
          opts.outputChannel.append(text);
          fullOutput += text;
        }
      } catch {
        // Non-JSON line (progress indicator, etc.) — append raw
        opts.outputChannel.appendLine(line);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      opts.outputChannel.appendLine(`[stderr] ${chunk.toString()}`);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        settle(() => resolve(fullOutput));
      } else {
        settle(() => reject(new Error(`claude exited with code ${code}`)));
      }
    });

    proc.on('error', (err) => {
      settle(() => reject(new Error(`Failed to spawn claude: ${err.message}`)));
    });

    // Write prompt to stdin
    proc.stdin!.write(opts.prompt);
    proc.stdin!.end();

    // Cancellation (D-14)
    const cancelDisposable = opts.token.onCancellationRequested(() => {
      proc.kill('SIGTERM');
      settle(() => reject(new Error('Cancelled by user')));
    });
    proc.on('close', () => cancelDisposable.dispose());

    // Hard timeout: 5 minutes (D-14)
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      settle(() => reject(new Error('Claude CLI timed out after 5 minutes')));
    }, TIMEOUT_MS);
  });
}
