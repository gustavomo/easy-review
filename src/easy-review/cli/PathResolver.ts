import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Common install locations for claude CLI.
 * Checked as last-resort fallback when shell detection fails (D-15).
 */
const COMMON_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  `${os.homedir()}/.local/bin`,
  `${os.homedir()}/.nvm/versions/node/current/bin`,
];

/**
 * Resolves the path to the claude CLI binary.
 * Priority order (D-15):
 *   1. easyReview.claudePath user setting
 *   2. Shell-env detection via interactive shell spawn
 *   3. Common install locations
 *
 * Does NOT use fix-path or shell-env packages — they are ESM-only and
 * incompatible with the CommonJS extension host (D-17).
 *
 * @returns Absolute path to claude binary, or undefined if not found.
 */
export function resolveClaudePath(): string | undefined {
  // 1. User-configured path takes priority (CFG-01)
  const configured = vscode.workspace
    .getConfiguration('easyReview')
    .get<string>('claudePath');
  if (configured && configured.trim() && fs.existsSync(configured.trim())) {
    return configured.trim();
  }

  // 2. Shell-env detection — source the user's interactive shell to get real PATH
  try {
    const shell = process.env.SHELL ?? '/bin/zsh';
    const result = execSync(`"${shell}" -i -c 'which claude'`, {
      encoding: 'utf8',
      timeout: 5000,
      env: { HOME: os.homedir(), PATH: process.env.PATH ?? '' },
    }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // Shell detection failed — continue to common paths fallback
  }

  // 3. Common install locations
  for (const dir of COMMON_PATHS) {
    const candidate = `${dir}/claude`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
