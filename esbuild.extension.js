// esbuild build script for extension host (CommonJS, externalizes vscode and better-sqlite3)
// NOTE: @anthropic-ai/claude-agent-sdk is intentionally NOT externalized.
// It is ESM-only and must be bundled by esbuild (format: 'cjs') to avoid
// ERR_REQUIRE_ESM at runtime in VS Code's Node 20 extension host.
const esbuild = require('esbuild');

esbuild.build({
	entryPoints: ['src/extension.ts'],
	bundle: true,
	outfile: 'dist/extension.js',
	external: ['vscode', 'better-sqlite3'],
	format: 'cjs',
	platform: 'node',
	target: 'node22',
	mainFields: ['module', 'main'],
	sourcemap: true,
	minify: process.env.NODE_ENV === 'production',
	loader: {
		'.gql': 'text',
		'.svg': 'text',
	},
}).catch(() => process.exit(1));
