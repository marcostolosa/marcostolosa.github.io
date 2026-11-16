// llms.txt: a plain-text map of the site for AI assistants and agents (https://llmstxt.org).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { abs } from '../data/seo';
import { disclosures, hallOfFame, links, profile, tools } from '../data/profile';
import { localize, type Lang } from '../i18n/ui';

export const GET: APIRoute = async () => {
  const writeups = (await getCollection('writeups', (w) => !w.data.draft)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const list = (lang: Lang) =>
    writeups
      .filter((w) => w.data.lang === lang)
      .map((w) => `- [${w.data.title}](${abs(localize(`/writeups/${w.id}/`, lang))}): ${w.data.summary}`)
      .join('\n');

  const body = `# ${profile.name} (${profile.handle})

> ${profile.lede.en} Based in ${profile.base.en}. The site is published in English (/en-us/) and Brazilian Portuguese (/pt-br/).

## Pages

- [Home](${abs('/en-us/')}): profile, public disclosures, hall of fame, tools and contact
- [Writeups](${abs('/en-us/writeups/')}): step-by-step pentest and red team writeups
- [Início (pt-BR)](${abs('/pt-br/')})
- [Writeups (pt-BR)](${abs('/pt-br/writeups/')})

## Writeups (English)

${list('en')}

## Writeups (Português)

${list('pt-br')}

## Public disclosures

${disclosures.map((d) => `- [${d.id}](${d.href}): ${d.cls}, severity ${d.sev}`).join('\n')}
- [Bugcrowd profile](${hallOfFame.record}): ${hallOfFame.summary.en} (${hallOfFame.agencies.join(', ')})

## Tools

${tools.map((t) => `- [${t.name}](${t.href.startsWith('/') ? abs(localize(t.href, 'en')) : t.href}): ${t.desc.en}`).join('\n')}

## Profiles

${links.map((l) => `- [${l.label}](${l.href})`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
