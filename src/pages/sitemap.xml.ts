// XML sitemap with hreflang alternates. Only canonical, indexable URLs.
import type { APIRoute } from 'astro';
import { abs, sitemapEntries } from '../data/seo';
import { htmlLang, type Lang } from '../i18n/ui';

export const GET: APIRoute = async () => {
  const urls = (await sitemapEntries()).map((e) => {
    const alts = Object.entries(e.alternates) as [Lang, string][];
    const links = alts.length > 1
      ? [
          ...alts.map(([l, p]) => `    <xhtml:link rel="alternate" hreflang="${htmlLang[l]}" href="${abs(p)}"/>`),
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(e.alternates.en ?? e.path)}"/>`,
        ]
      : [];
    const lastmod = e.lastmod ? [`    <lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>`] : [];
    return ['  <url>', `    <loc>${abs(e.path)}</loc>`, ...lastmod, ...links, '  </url>'].join('\n');
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
