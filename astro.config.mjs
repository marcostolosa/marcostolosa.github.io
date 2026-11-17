// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';

/** Pixel size of a WebP in public/, read from its header (VP8X, VP8L or VP8 chunk). */
function webpSize(file) {
  const b = readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { width: 1 + (n & 0x3fff), height: 1 + ((n >> 14) & 0x3fff) };
  }
  if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  return null;
}

/**
 * Images from public/img in the built pages: width and height so the page does not shift while they
 * load, async decoding, and lazy loading for every image after the first one on a page.
 * Done on the built HTML because the Markdown processor takes no rehype plugins.
 */
const imageAttributes = {
  name: 'image-attributes',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      for (const rel of await readdir(dir, { recursive: true })) {
        if (!rel.endsWith('.html')) continue;
        const file = new URL(rel, dir);
        const html = await readFile(file, 'utf8');
        let seen = 0;
        const out = html.replace(/<img src="(\/img\/[^"]+\.webp)"(?![^>]*\bwidth=)/g, (_, src) => {
          const size = webpSize(new URL(`.${src}`, dir));
          const dims = size ? ` width="${size.width}" height="${size.height}"` : '';
          // Big screenshots ship a 1600px sibling for the article column; the lightbox opens the full file.
          const small = src.replace(/\.webp$/, '-1600.webp');
          const srcset = size && existsSync(new URL(`.${small}`, dir))
            ? ` srcset="${small} 1600w, ${src} ${size.width}w" sizes="(max-width: 800px) 100vw, 800px"`
            : '';
          return `<img src="${src}"${srcset}${dims} decoding="async"${seen++ > 0 ? ' loading="lazy"' : ''}`;
        });
        if (out !== html) await writeFile(file, out);
      }
    },
  },
};

export default defineConfig({
  site: 'https://mindsecurity.org',
  trailingSlash: 'ignore',
  integrations: [imageAttributes],
  // About 9 KB of CSS: inlined, it no longer blocks the first paint.
  build: { inlineStylesheets: 'always' },
  markdown: {
    // Code blocks pick up the palette from CSS variables in src/styles/global.css.
    shikiConfig: { theme: 'css-variables', wrap: false },
  },
  // WebAssembly: Vite imports `.wasm?init` natively; add vite-plugin-wasm here when a module needs ESM-style wasm imports.
});
