import { dirname, resolve } from "node:path";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from 'vite';
import { resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: {
        "editor-example": resolve(__dirname, 'examples/editor-example.html'),
      example: resolve(__dirname, 'examples/index.html'),
      },
      output: {
        manualChunks: {
          'lit-vendor': ['lit'],
          'ajv-vendor': ['ajv'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  optimizeDeps: {
    include: ['lit', 'ajv'],
  },
});
