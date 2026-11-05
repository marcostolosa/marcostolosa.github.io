// Single source of truth for the home page. Every entry must link to a public record.

export const profile = {
  name: 'Marcos Tolosa',
  handle: 'Tr0p',
  base: 'Rio de Janeiro, BR',
  method: 'Break it, understand it, automate it, teach it.',
  lede:
    'Red teamer, exploit developer and reverse engineer. I take every finding apart to its root cause, turn it into tooling, and write it up so you can follow.',
  email: 'marcos.tolosa@owasp.org',
};

export type Disclosure = {
  id: string;
  href: string;
  sym: string; // target symbol, used for xref highlighting
  cls: string;
  note?: string;
  sev: string;
  crit?: boolean;
};

export const disclosures: Disclosure[] = [
  {
    id: 'CVE-2025-10230',
    href: 'https://aisle.com/blog/cve-2025-10230-the-cvss-100-vulnerability-that-hid-in-samba-for-13-years',
    sym: 'samba',
    cls: 'OS command injection',
    note: 'hidden for 13 years',
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
    note: 'federal infrastructure',
    sev: 'P1',
    crit: true,
  },
  {
    id: 'Digital Flanders',
    href: 'https://yeswehack.com/programs/digital-flanders-vulnerability-disclosure-program#program-activity',
    sym: 'be_gov',
    cls: 'blind XXE → internal SSRF',
    note: 'reached Tomcat Manager',
    sev: 'HIGH',
  },
  {
    id: 'Samba CTDB',
    href: 'https://gitlab.com/samba-team/samba/-/merge_requests/4240/diffs?commit_id=caa2ac41bf25c524cbe5079a450d87f30a25b0a2',
    sym: 'samba',
    cls: 'buffer overflow',
    note: 'unsafe sprintf() in the InfiniBand wrapper',
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
  summary: '6× U.S. Government · 15 valid · 93.75% accuracy',
  also: 'Digital Flanders (Belgian Government)',
  record: 'https://bugcrowd.com/h/Tr0p',
};

export const tools = [
  {
    name: 'MANW-NG',
    href: '/manw-ng.html',
    repo: 'https://github.com/marcostolosa/manw-ng',
    desc: 'Win32/NTAPI docs scraper plus a live ctypes execution engine, built for reversers who never leave the terminal.',
    tags: 'python · windows internals',
  },
  {
    name: 'OCRack',
    href: '/ocrack.html',
    repo: 'https://github.com/marcostolosa/OCRack',
    desc: 'Translate and OCR any PDF while keeping its layout. PaddleOCR, PyMuPDF and an LLM.',
    tags: 'python · ocr · ai',
  },
  {
    name: 'ARCTAX',
    href: 'https://github.com/marcostolosa/arctax',
    desc: 'Prompt-injection research generator with an ML classifier and a local LLM.',
    tags: 'ai red teaming',
  },
  {
    name: 'REload.Me',
    href: 'https://github.com/mindsecurity/REload.Me',
    desc: 'A simpler way to learn reverse engineering.',
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

// Function rail. Addresses are decorative but stable.
export const functions = [
  { addr: '00401000', name: 'whoami', href: '/#whoami' },
  { addr: '00401140', name: 'disclosures', href: '/#disclosures' },
  { addr: '00401300', name: 'hall_of_fame', href: '/#hall_of_fame' },
  { addr: '00401480', name: 'tools', href: '/#tools' },
  { addr: '00401520', name: 'writeups', href: '/writeups/' },
  { addr: '00401600', name: 'connect', href: '/#connect' },
];
