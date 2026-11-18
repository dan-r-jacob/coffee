import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The finished app is written to the repository root (one level up), so GitHub Pages
// "Deploy from a branch" can serve it directly. Relative paths ('./') make it work
// at any address, e.g. https://<user>.github.io/<repository>/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    assetsDir: 'assets',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.exporter?.includes('@supabase/')) return;
        warn(warning);
      }
    }
  }
});
