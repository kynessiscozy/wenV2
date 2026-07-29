import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wenV2/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      treeshake: false,
    },
  },
});
