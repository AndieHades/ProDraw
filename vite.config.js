import { defineConfig } from 'vite';

// Web build remains a GitHub Pages development surface; Electron uses file URLs.
export default defineConfig(({ command, mode }) => ({
  base: mode === 'desktop' ? './' : command === 'build' ? '/ProDraw/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2020' },
  server: { watch: { ignored: ['**/artifacts/**', '**/dist/**'] },
    // Dev-обёртки задают порт через PORT; без этого vite берёт свой и
    // предпросмотр открывает не тот адрес.
    ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}) },
}));
