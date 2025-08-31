import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@tauri-apps/plugin-fs': path.resolve(__dirname, 'test/__mocks__/tauri-fs.ts'),
    },
  },
});

