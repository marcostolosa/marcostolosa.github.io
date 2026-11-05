// Every route the site ships, with the <html lang> it must declare.
export const pages = [
  { path: '/', lang: 'en-US', home: true },
  { path: '/pt-br/', lang: 'pt-BR', home: true },
  { path: '/writeups/', lang: 'en-US' },
  { path: '/pt-br/writeups/', lang: 'pt-BR' },
  { path: '/writeups/fixture-article/', lang: 'en-US' },
] as const;

export const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
