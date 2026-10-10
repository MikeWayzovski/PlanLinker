import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));

const PDFJS_COPIES = [
  ['node_modules/pdfjs-dist/wasm', 'public/pdfjs-wasm'],
  ['node_modules/pdfjs-dist/cmaps', 'public/pdfjs-cmaps'],
  ['node_modules/pdfjs-dist/standard_fonts', 'public/pdfjs-standard_fonts'],
];

/** Copy PDF.js wasm/cmaps/fonts into public/ so Vite and Vercel serve them as static files. */
function copyPdfjsAssets() {
  const copy = () => {
    PDFJS_COPIES.forEach(([fromRel, toRel]) => {
      const from = resolve(rootDir, fromRel);
      const to = resolve(rootDir, toRel);
      if (!existsSync(from)) return;
      mkdirSync(to, { recursive: true });
      cpSync(from, to, { recursive: true });
    });
  };

  return {
    name: 'copy-pdfjs-assets',
    buildStart: copy,
    configureServer: copy,
  };
}

export default defineConfig({
  plugins: [react(), copyPdfjsAssets()],
  server: {
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
});
