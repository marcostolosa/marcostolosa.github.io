/** True when the suite runs against a deployed site (no test fixtures there). */
export const LIVE = !!process.env.BASE_URL;

// Every route the site ships, with the <html lang> it must declare.
const all = [
  { path: '/en-us/', lang: 'en-US', home: true },
  { path: '/pt-br/', lang: 'pt-BR', home: true },
  { path: '/en-us/pentest/', lang: 'en-US' },
  { path: '/pt-br/pentest/', lang: 'pt-BR' },
  { path: '/en-us/writeups/', lang: 'en-US' },
  { path: '/pt-br/writeups/', lang: 'pt-BR' },
  { path: '/en-us/manw-ng/', lang: 'en-US' },
  { path: '/pt-br/manw-ng/', lang: 'pt-BR' },
  { path: '/en-us/ocrack/', lang: 'en-US' },
  { path: '/pt-br/ocrack/', lang: 'pt-BR' },
  { path: '/en-us/atticus/', lang: 'en-US' },
  { path: '/pt-br/atticus/', lang: 'pt-BR' },
  { path: '/en-us/anubis/', lang: 'en-US' },
  { path: '/pt-br/anubis/', lang: 'pt-BR' },
  { path: '/en-us/privacy/', lang: 'en-US' },
  { path: '/pt-br/privacy/', lang: 'pt-BR' },
  { path: '/en-us/writeups/fixture-article/', lang: 'en-US', fixture: true },
] as const;
export const pages = all.filter((p) => !(LIVE && 'fixture' in p));

export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
