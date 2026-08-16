import { defineConfig } from 'vite';

// База для GitHub Pages (https://<user>.github.io/pixelize-tool/).
// Локально для dev переопределяется на '/'.
export default defineConfig(({ command, mode }) => ({
  base: mode === 'desktop' ? './' : command === 'build' ? '/ProDraw/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
}));
