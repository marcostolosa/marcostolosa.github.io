export const locales = ['en', 'pt-br'] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = 'en';

/** BCP 47 tag for <html lang> and hreflang. */
export const htmlLang: Record<Lang, string> = { en: 'en-US', 'pt-br': 'pt-BR' };
export const langLabel: Record<Lang, string> = { en: 'EN', 'pt-br': 'PT' };
export const langName: Record<Lang, string> = { en: 'English', 'pt-br': 'Português (Brasil)' };

/** Bilingual string. */
export type T = { en: string; 'pt-br': string };
export const tr = (v: T | string, lang: Lang) => (typeof v === 'string' ? v : v[lang]);

/** First URL segment of every page: /en-us/... and /pt-br/... The site root only redirects to one of them. */
export const urlPrefix: Record<Lang, string> = { en: 'en-us', 'pt-br': 'pt-br' };

/** Prefix a site-root path for a locale: ('/writeups/', 'pt-br') -> '/pt-br/writeups/'. */
export const localize = (path: string, lang: Lang) => `/${urlPrefix[lang]}${path}`;

/** getStaticPaths entries for a page that exists in every locale under src/pages/[loc]/. */
export const localePaths = () => locales.map((lang) => ({ params: { loc: urlPrefix[lang] }, props: { lang } }));

/** URL slug of a writeup: the file id without its language suffix, since the locale is already in the path. 'htb-redeye-en' -> 'htb-redeye'. */
export const slugOf = (id: string) => id.replace(/-en$/, '');

/** Strip the locale prefix from a pathname: '/pt-br/writeups/' -> '/writeups/'. */
export const unlocalize = (path: string) => path.replace(/^\/(en-us|pt-br)(?=\/|$)/, '') || '/';

export const ui = {
  skip: { en: 'Skip to content', 'pt-br': 'Pular para o conteúdo' },
  nav: { en: 'Sections', 'pt-br': 'Seções' },
  findings: { en: 'Findings', 'pt-br': 'Achados' },
  tools: { en: 'Tools', 'pt-br': 'Ferramentas' },
  writeups: { en: 'Writeups', 'pt-br': 'Writeups' },
  contact: { en: 'Contact', 'pt-br': 'Contato' },
  method: { en: 'Break, understand, automate, teach.', 'pt-br': 'Quebrar, entender, automatizar, ensinar.' },
  authorized: { en: 'Authorized targets only.', 'pt-br': 'Somente alvos autorizados.' },
  language: { en: 'Language', 'pt-br': 'Idioma' },
  home: { en: 'Home', 'pt-br': 'Início' },
} satisfies Record<string, T>;
