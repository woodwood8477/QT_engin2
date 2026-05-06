import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const base = process.env.VITE_BASE_PATH ?? './';
const outDir = process.env.VITE_OUT_DIR ?? 'dist';

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir,
    emptyOutDir: !process.env.VITE_OUT_DIR,
    target: 'es2020',
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
