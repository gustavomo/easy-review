import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: [
      'src/test/unit/**/*.test.ts',
      'src/easy-review/**/*.test.ts',
      'src/webview/**/*.test.ts',
    ],
    exclude: ['src/test/integration/**'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/easy-review/**/*.ts'],
      exclude: ['src/easy-review/**/*.test.ts'],
    },
    // No watch mode — single run only
    watch: false,
  },
  // Treat .gql files as static assets (returns empty string) — upstream imports GQL files
  // as text; without this handler Vite's import-analysis plugin rejects them (D-01 decision).
  assetsInclude: ['**/*.gql', '**/*.svg'],
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'src/test/__mocks__/vscode.ts'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
