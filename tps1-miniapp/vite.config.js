import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Zalo Mini App không support ES modules / import giữa các chunks
    // Phải dùng iife (single self-executing bundle)
    target: 'es2015',
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'TPS1App',
        // Không dùng manualChunks khi format là iife
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
