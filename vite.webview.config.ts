import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'dist/webview',
		rollupOptions: {
			input: 'src/webview/index.tsx',
			output: {
				entryFileNames: 'webview.js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name].[ext]',
			},
		},
	},
	resolve: {
		alias: {
			'@shared': path.resolve(__dirname, 'src/shared'),
		},
	},
});
