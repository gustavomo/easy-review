import * as vscode from 'vscode';

/**
 * Encodes a GitHub file reference into an easy-review-diff:// URI.
 *
 * URI shape:
 *   easy-review-diff://<owner>+<repo>/<filePath>?ref=<sha>&label=<human-label>
 *
 * The `+` separator in authority avoids URI authority parsing issues with `/`.
 * Special chars in ref (SHA — hex only) and label are percent-encoded.
 * Pass ref='EMPTY' for files that don't exist at this ref (added/removed).
 */
export function encodeDiffUri(
  owner: string,
  repo: string,
  ref: string,
  filePath: string,
  label: string,
): vscode.Uri {
  return vscode.Uri.from({
    scheme: 'easy-review-diff',
    authority: `${owner}+${repo}`,
    path: '/' + filePath,
    query: `ref=${encodeURIComponent(ref)}&label=${encodeURIComponent(label)}`,
  });
}

/**
 * Decodes an easy-review-diff:// URI back into its component parts.
 *
 * Note: uri.path.slice(1) removes the leading `/` added by encodeDiffUri.
 */
export function decodeDiffUri(uri: vscode.Uri): {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  label: string;
} {
  const [owner, repo] = uri.authority.split('+');
  const path = uri.path.slice(1); // strip leading '/'
  const params = new URLSearchParams(uri.query);
  return {
    owner,
    repo,
    ref: decodeURIComponent(params.get('ref') ?? ''),
    path,
    label: decodeURIComponent(params.get('label') ?? ''),
  };
}
