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

/** Prefix a site-root path for a locale: ('/writeups/', 'pt-br') -> '/pt-br/writeups/'. */
export const localize = (path: string, lang: Lang) => (lang === defaultLang ? path : `/${lang}${path}`);

/** Strip the locale prefix from a pathname: '/pt-br/writeups/' -> '/writeups/'. */
export const unlocalize = (path: string) => path.replace(/^\/pt-br(?=\/|$)/, '') || '/';

export const langFromPath = (path: string): Lang => (/^\/pt-br(\/|$)/.test(path) ? 'pt-br' : 'en');

export const ui = {
  skip: { en: 'Skip to content', 'pt-br': 'Pular para o conteúdo' },
  controls: { en: 'Debugger controls', 'pt-br': 'Controles do debugger' },
  run: { en: 'Run', 'pt-br': 'Run' },
  runTitle: { en: 'Run to connect() (F9)', 'pt-br': 'Run até connect() (F9)' },
  step: { en: 'Step', 'pt-br': 'Step' },
  stepTitle: { en: 'Step to the next section (F8 or n)', 'pt-br': 'Avança para a próxima seção (F8 ou n)' },
  writeups: { en: 'Writeups', 'pt-br': 'Writeups' },
  pausedIn: { en: 'Paused in', 'pt-br': 'Pausado em' },
  paused: { en: 'Paused', 'pt-br': 'Pausado' },
  method: { en: 'break → understand → automate → teach', 'pt-br': 'quebrar → entender → automatizar → ensinar' },
  authorized: { en: 'authorized targets only', 'pt-br': 'somente alvos autorizados' },
  language: { en: 'Language', 'pt-br': 'Idioma' },
  backHome: { en: 'whoami()', 'pt-br': 'whoami()' },
} satisfies Record<string, T>;
