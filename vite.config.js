import { defineConfig } from 'vite';

// Web build remains a GitHub Pages development surface; Electron uses file URLs.
export default defineConfig(({ command, mode }) => ({
  base: mode === 'desktop' ? './' : command === 'build' ? '/ProDraw/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
  server: { watch: { ignored: ['**/artifacts/**', '**/dist/**'] } },
}));
