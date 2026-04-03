import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/test/unit/**/*.test.ts'],
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
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'src/test/__mocks__/vscode.ts'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
