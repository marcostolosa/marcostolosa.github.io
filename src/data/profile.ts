// Single source of truth for the home page. Every entry must link to a public record.
// Bilingual fields use { en, 'pt-br' }; identifiers, product names and vuln classes stay in English.
import type { T } from '../i18n/ui';

export const profile = {
  name: 'Marcos Tolosa',
  handle: 'Tr0p',
  base: { en: 'Rio de Janeiro, BR', 'pt-br': 'Rio de Janeiro, BR' } as T,
  lede: {
    en: 'Red teamer, pentester and bug bounty hunter. I take every finding down to its root cause, turn it into tooling, and write it up so you can follow.',
    'pt-br': 'Red teamer, pentester e bug hunter. Levo cada achado até a causa raiz, transformo em ferramenta e documento pra você conseguir seguir.',
  } as T,
  email: 'marcos.tolosa@owasp.org',
};

export type Disclosure = {
  id: string;
  href: string;
  sym: string; // target key: links the finding to its target node in the graph
  cls: string;
  note?: T;
  sev: string;
  crit?: boolean;
};

export const disclosures: Disclosure[] = [
  {
    id: 'CVE-2025-10230',
    href: 'https://aisle.com/blog/cve-2025-10230-the-cvss-100-vulnerability-that-hid-in-samba-for-13-years',
    sym: 'samba',
    cls: 'OS command injection',
    note: { en: 'hidden for 13 years', 'pt-br': 'escondida por 13 anos' },
    sev: '10.0',
    crit: true,
  },
  {
    id: 'CVE-2026-23722',
    href: 'https://github.com/LabRedesCefetRJ/WeGIA/security/advisories/GHSA-g7hh-6qj7-mcqf',
    sym: 'wegia',
    cls: 'stored XSS → RCE / UI redressing',
    sev: '9.1',
    crit: true,
  },
  {
    id: 'CVE-2025-67503',
    href: 'https://github.com/LabRedesCefetRJ/WeGIA/security/advisories/GHSA-r9mh-4hc4-h2p3',
    sym: 'wegia',
    cls: 'reflected XSS',
    sev: '8.2',
  },
  {
    id: 'NCUA VDP',
    href: 'https://bugcrowd.com/engagements/ncua-vdp/crowdstream',
    sym: 'us_gov',
    cls: 'unauthenticated OS command injection',
    note: { en: 'federal infrastructure', 'pt-br': 'infraestrutura federal' },
    sev: 'P1',
    crit: true,
  },
  {
    id: 'Digital Flanders',
    href: 'https://yeswehack.com/programs/digital-flanders-vulnerability-disclosure-program#program-activity',
    sym: 'be_gov',
    cls: 'blind XXE → internal SSRF',
    note: { en: 'reached Tomcat Manager', 'pt-br': 'chegou ao Tomcat Manager' },
    sev: 'HIGH',
  },
  {
    id: 'Samba CTDB',
    href: 'https://gitlab.com/samba-team/samba/-/merge_requests/4240/diffs?commit_id=caa2ac41bf25c524cbe5079a450d87f30a25b0a2',
    sym: 'samba',
    cls: 'buffer overflow',
    note: { en: 'unsafe sprintf() in the InfiniBand wrapper', 'pt-br': 'sprintf() inseguro no wrapper InfiniBand' },
    sev: 'MEM',
  },
];

export const hallOfFame = {
  agencies: [
    'NASA',
    'U.S. Dept. of Commerce',
    'Dept. of Veterans Affairs',
    'NCUA',
    'EPA',
    'U.S. Fish & Wildlife Service',
  ],
  summary: {
    en: '6× U.S. Government · 15 valid · 93.75% accuracy',
    'pt-br': '6× Governo dos EUA · 15 válidas · 93,75% de precisão',
  } as T,
  also: { en: 'Digital Flanders (Belgian Government)', 'pt-br': 'Digital Flanders (Governo da Bélgica)' } as T,
  record: 'https://bugcrowd.com/h/Tr0p',
};

export const tools: { name: string; href: string; repo?: string; desc: T; tags: string }[] = [
  {
    name: 'MANW-NG',
    href: '/manw-ng/',
    repo: 'https://github.com/marcostolosa/manw-ng',
    desc: {
      en: 'Win32/NTAPI docs scraper plus a live ctypes execution engine, built for reversers who never leave the terminal.',
      'pt-br': 'Scraper de docs Win32/NTAPI com engine de execução ctypes ao vivo, feito pra quem reversa sem sair do terminal.',
    },
    tags: 'python · windows internals',
  },
  {
    name: 'OCRack',
    href: '/ocrack/',
    repo: 'https://github.com/marcostolosa/OCRack',
    desc: {
      en: 'Translate and OCR any PDF while keeping its layout. PaddleOCR, PyMuPDF and an LLM.',
      'pt-br': 'Traduz e faz OCR de qualquer PDF mantendo o layout. PaddleOCR, PyMuPDF e um LLM.',
    },
    tags: 'python · ocr · ai',
  },
  {
    name: 'Atticus',
    href: '/atticus/',
    repo: 'https://github.com/marcostolosa/atticus-linux',
    desc: {
      en: 'Voice assistant overlay for Omarchy (Hyprland/Wayland). Hotkey or wake word, local Whisper and Piper speech in Portuguese and English, model shell commands sandboxed with bubblewrap.',
      'pt-br': 'Assistente de voz em overlay pro Omarchy (Hyprland/Wayland). Hotkey ou wake word, fala local com Whisper e Piper em português e inglês, comandos do modelo isolados em sandbox bubblewrap.',
    },
    tags: 'python · wayland · voice ai',
  },
  {
    name: 'ARCTAX',
    href: 'https://github.com/marcostolosa/arctax',
    desc: {
      en: 'Prompt-injection research generator with an ML classifier and a local LLM.',
      'pt-br': 'Gerador de pesquisa em prompt injection com classificador de ML e LLM local.',
    },
    tags: 'ai red teaming',
  },
  {
    name: 'REload.Me',
    href: 'https://github.com/mindsecurity/REload.Me',
    desc: { en: 'A simpler way to learn reverse engineering.', 'pt-br': 'Um jeito mais simples de aprender engenharia reversa.' },
    tags: 're · education',
  },
];

export const imports = [
  'IDA Pro', 'Ghidra', 'Rizin', 'x64dbg', 'Frida', 'pwndbg',
  'BloodHound', 'Impacket', 'Certipy', 'Rubeus', 'Havoc', 'Cobalt Strike',
  'Burp Suite Pro', 'pwntools', 'Semgrep', 'CodeQL', 'nuclei', 'ffuf',
];

export const links = [
  { label: 'github', href: 'https://github.com/marcostolosa' },
  { label: 'bugcrowd', href: 'https://bugcrowd.com/h/Tr0p' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/marcos-tolosa/' },
  { label: 'youtube', href: 'https://youtube.com/@Marcos.Tolosa' },
  { label: 'x', href: 'https://twitter.com/MarcosTolosa_' },
  { label: 'discord', href: 'https://discord.gg/T9RVG3re2J' },
];

/** Bug bounty platforms where the record above was earned. */
export const platforms = ['Bugcrowd', 'HackerOne', 'YesWeHack', 'Intigriti'];

/** Home page sections in reading order; ids are the anchors. Tests import this list. */
export const homeSections = ['whoami', 'disclosures', 'hall_of_fame', 'tools', 'writeups', 'connect'] as const;
