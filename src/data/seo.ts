// Structured data (JSON-LD) and the list of indexable URLs. One place, so the sitemap, llms.txt and
// the pages cannot disagree about what exists.
import { getCollection } from 'astro:content';
import { htmlLang, locales, localize, slugOf, type Lang } from '../i18n/ui';
import { links, profile } from './profile';
import { toolPages } from './toolpages';

export const SITE = 'https://mindsecurity.org';
export const abs = (path: string) => new URL(path, SITE).href;

/** Social card used by every page that does not set its own: 1200×630. */
export const ogImage = { src: '/og.png', width: 1200, height: 630 };

const PERSON_ID = `${SITE}/#person`;
const SITE_ID = `${SITE}/#website`;

/** A reference to the author, for pages that are not about him. */
export const authorRef = { '@type': 'Person', '@id': PERSON_ID, name: profile.name, url: abs(localize('/', 'en')) };

export const personSchema = (lang: Lang) => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: profile.name,
  alternateName: profile.handle,
  url: abs(localize('/', lang)),
  description: profile.lede[lang],
  jobTitle: lang === 'en' ? 'Red teamer, penetration tester and bug bounty hunter' : 'Red teamer, pentester e bug bounty hunter',
  address: { '@type': 'PostalAddress', addressLocality: 'Rio de Janeiro', addressCountry: 'BR' },
  knowsAbout: [
    'Penetration testing', 'Red teaming', 'Bug bounty', 'Vulnerability research', 'Active Directory security',
    'Web application security', 'Exploit development', 'OSINT',
  ],
  // Discord is an invite, not a profile.
  sameAs: links.filter((l) => l.label !== 'discord').map((l) => l.href),
});

export const websiteSchema = (lang: Lang) => ({
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: `${SITE}/`,
  name: `${profile.name} (${profile.handle})`,
  alternateName: 'mindsecurity.org',
  inLanguage: locales.map((l) => htmlLang[l]),
  description: profile.lede[lang],
  publisher: { '@id': PERSON_ID },
});

export const breadcrumbSchema = (trail: [name: string, path: string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

/** Wrap nodes in one @graph. */
export const graph = (...nodes: object[]) => ({ '@context': 'https://schema.org', '@graph': nodes });

export type SitemapEntry = { path: string; lang: Lang; alternates: Partial<Record<Lang, string>>; lastmod?: Date };

/** Every indexable page. Redirect stubs and the 404 are not here. */
export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const both = (path: string): SitemapEntry[] => {
    const alternates = Object.fromEntries(locales.map((l) => [l, localize(path, l)])) as Record<Lang, string>;
    return locales.map((lang) => ({ path: alternates[lang], lang, alternates }));
  };
  const writeups = (await getCollection('writeups', (w) => !w.data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const ids = new Set(writeups.map((w) => w.id));
  return [
    ...both('/'),
    ...both('/writeups/'),
    ...writeups.map((w) => {
      const lang = w.data.lang as Lang;
      const path = localize(`/writeups/${slugOf(w.id)}/`, lang);
      const other: Lang = lang === 'en' ? 'pt-br' : 'en';
      const pair = w.data.pair && ids.has(w.data.pair) ? { [other]: localize(`/writeups/${slugOf(w.data.pair)}/`, other) } : {};
      return { path, lang, alternates: { [lang]: path, ...pair }, lastmod: w.data.date };
    }),
    ...Object.keys(toolPages).flatMap((tool) => both(`/${tool}/`)),
  ];
}
