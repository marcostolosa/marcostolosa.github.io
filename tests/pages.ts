/** True when the suite runs against a deployed site (no test fixtures there). */
export const LIVE = !!process.env.BASE_URL;

// Every route the site ships, with the <html lang> it must declare.
const all = [
  { path: '/', lang: 'en-US', home: true },
  { path: '/pt-br/', lang: 'pt-BR', home: true },
  { path: '/writeups/', lang: 'en-US' },
  { path: '/pt-br/writeups/', lang: 'pt-BR' },
  { path: '/writeups/fixture-article/', lang: 'en-US', fixture: true },
] as const;
export const pages = all.filter((p) => !(LIVE && 'fixture' in p));

export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
