/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'dist/webview',
		// mermaid adds ~2-3MB to the bundle after tree-shaking; raise limit to suppress warning
		chunkSizeWarningLimit: 4000,
		rollupOptions: {
			input: {
				webview: 'src/webview/index.tsx',
				prOverview: 'src/webview/prOverview.tsx',
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].[ext]',
				// Pitfall 1 mitigation: consolidate mermaid into a single chunk.
				// mermaid v11 splits diagram renderers into lazy-loaded chunks by default.
				// VS Code webview CSP blocks dynamic import() at runtime — consolidation prevents this.
				manualChunks(id) {
					if (id.includes('node_modules/mermaid') || id.includes('node_modules/dagre')) {
						return 'mermaid-bundle';
					}
				},
			},
		},
	},
	resolve: {
		alias: {
			'@shared': path.resolve(__dirname, 'src/shared'),
		},
	},
});
