// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mindsecurity.org',
  trailingSlash: 'ignore',
  markdown: {
    // Code blocks pick up the palette from CSS variables in src/styles/global.css.
    shikiConfig: { theme: 'css-variables', wrap: false },
  },
  // WebAssembly: Vite imports `.wasm?init` natively; add vite-plugin-wasm here when a module needs ESM-style wasm imports.
});
