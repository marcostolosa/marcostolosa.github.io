// The home page hero: Tr0p's public record as a link-analysis graph.
// Built from profile.ts so the graph and the sections below can never disagree.
// Layout runs at build time (deterministic), so the page ships final positions and an SVG fallback.
import { tr, type Lang } from '../i18n/ui';
import { disclosures, hallOfFame, links, profile, tools } from './profile';

export type NodeType = 'person' | 'vuln' | 'target' | 'account' | 'tool' | 'writeup';
export type GNode = {
  id: string;
  type: NodeType;
  label: string;
  desc: string;
  /** Where the claim can be checked. */
  href?: string;
  /** Short, human-readable form of href. */
  src?: string;
  size: number;
  /** Labelled even when not selected (desktop). */
  key?: boolean;
  depth: number;
  p: [number, number, number];
};
export type Graph = { nodes: GNode[]; edges: [number, number][] };

export const typeName: Record<NodeType, { en: string; 'pt-br': string }> = {
  person: { en: 'Person', 'pt-br': 'Pessoa' },
  vuln: { en: 'Vulnerability', 'pt-br': 'Vulnerabilidade' },
  target: { en: 'Target', 'pt-br': 'Alvo' },
  account: { en: 'Account', 'pt-br': 'Conta' },
  tool: { en: 'Tool', 'pt-br': 'Ferramenta' },
  writeup: { en: 'Writeup', 'pt-br': 'Writeup' },
};

const host = (href: string) => {
  if (href.startsWith('mailto:')) return href.slice(7).split('?')[0];
  if (href.startsWith('#')) return href;
  if (href.startsWith('/')) return `mindsecurity.org${href}`;
  const u = new URL(href);
  const path = u.pathname.replace(/\/$/, '');
  const short = path.length > 26 ? `${path.slice(0, 25)}…` : path;
  return u.hostname.replace(/^www\./, '') + short;
};

const targets: Record<string, { label: string; desc: { en: string; 'pt-br': string }; href: string }> = {
  samba: {
    label: 'Samba',
    desc: {
      en: 'The SMB/AD suite behind file sharing on most Linux servers. Two findings: a CVSS 10.0 and a memory bug.',
      'pt-br': 'A suíte SMB/AD por trás do compartilhamento de arquivos na maioria dos servidores Linux. Dois achados: um CVSS 10.0 e um bug de memória.',
    },
    href: 'https://gitlab.com/samba-team/samba',
  },
  wegia: {
    label: 'WeGIA',
    desc: {
      en: 'Open-source management system for charities. Two CVEs through coordinated disclosure.',
      'pt-br': 'Sistema open source de gestão para instituições de caridade. Duas CVEs por divulgação coordenada.',
    },
    href: 'https://github.com/LabRedesCefetRJ/WeGIA',
  },
  be_gov: {
    label: 'Belgian Government',
    desc: {
      en: 'Digital Flanders vulnerability disclosure programme, run on YesWeHack.',
      'pt-br': 'Programa de divulgação de vulnerabilidades do Digital Flanders, hospedado no YesWeHack.',
    },
    href: 'https://yeswehack.com/programs/digital-flanders-vulnerability-disclosure-program',
  },
};

const accountDesc: Record<string, { en: string; 'pt-br': string }> = {
  github: { en: 'Source code for every tool on this page.', 'pt-br': 'Código-fonte de todas as ferramentas desta página.' },
  bugcrowd: { en: 'Public bug bounty record: Hall of Fame entries, valid findings, accuracy.', 'pt-br': 'Registro público de bug bounty: Hall of Fame, achados válidos, precisão.' },
  linkedin: { en: 'Professional history.', 'pt-br': 'Histórico profissional.' },
  youtube: { en: 'Talks and walkthroughs.', 'pt-br': 'Palestras e demonstrações.' },
  x: { en: 'Research notes and disclosures as they land.', 'pt-br': 'Notas de pesquisa e divulgações em tempo real.' },
  discord: { en: 'Community server.', 'pt-br': 'Servidor da comunidade.' },
};

type Writeup = { id: string; title: string; summary: string };

export function buildGraph(lang: Lang, writeups: Writeup[]): Graph {
  const nodes: Omit<GNode, 'depth' | 'p'>[] = [];
  const edges: [number, number][] = [];
  const index = new Map<string, number>();
  const add = (n: Omit<GNode, 'depth' | 'p' | 'src'>) => {
    index.set(n.id, nodes.length);
    nodes.push({ ...n, src: n.href ? host(n.href) : undefined });
    return nodes.length - 1;
  };
  const link = (a: string, b: string) => edges.push([index.get(a)!, index.get(b)!]);

  add({
    id: 'tr0p', type: 'person', label: `${profile.name} (${profile.handle})`, size: 1, key: true,
    desc: tr(profile.lede, lang), href: '#connect',
  });
  nodes[0].src = profile.email;

  // accounts first: other nodes cite them
  for (const l of links) {
    add({ id: `acc:${l.label}`, type: 'account', label: l.label === 'x' ? 'X' : l.label[0].toUpperCase() + l.label.slice(1), size: l.label === 'bugcrowd' || l.label === 'github' ? 0.44 : 0.3, desc: tr(accountDesc[l.label], lang), href: l.href });
    link('tr0p', `acc:${l.label}`);
  }
  add({
    id: 'acc:owasp', type: 'account', label: 'OWASP', size: 0.34,
    desc: lang === 'en' ? 'Member since 2021.' : 'Membro desde 2021.', href: `mailto:${profile.email}`,
  });
  link('tr0p', 'acc:owasp');

  // targets
  for (const [k, t] of Object.entries(targets)) add({ id: `tgt:${k}`, type: 'target', label: t.label, size: 0.46, key: true, desc: tr(t.desc, lang), href: t.href });
  add({ id: 'tgt:us_gov', type: 'target', label: 'U.S. Government', size: 0.62, key: true, desc: tr(hallOfFame.summary, lang), href: hallOfFame.record });
  link('acc:bugcrowd', 'tgt:us_gov');
  for (const a of hallOfFame.agencies) {
    add({
      id: `agency:${a}`, type: 'target', label: a, size: 0.3,
      desc: lang === 'en' ? 'Hall of Fame entry for a valid vulnerability report.' : 'Entrada no Hall of Fame por um report de vulnerabilidade válido.',
      href: hallOfFame.record,
    });
    link('tgt:us_gov', `agency:${a}`);
  }

  // disclosures
  for (const d of disclosures) {
    const sev = d.sev === '10.0' ? 0.72 : d.crit ? 0.5 : 0.4;
    const note = d.note ? ` ${tr(d.note, lang)[0].toUpperCase()}${tr(d.note, lang).slice(1)}.` : '';
    add({ id: `vuln:${d.id}`, type: 'vuln', label: d.id, size: sev, key: d.sev === '10.0', desc: `${d.cls[0].toUpperCase()}${d.cls.slice(1)}. ${lang === 'en' ? 'Severity' : 'Severidade'} ${d.sev}.${note}`, href: d.href });
    link('tr0p', `vuln:${d.id}`);
    link(`vuln:${d.id}`, d.sym === 'us_gov' ? 'agency:NCUA' : `tgt:${d.sym}`);
  }
  link('vuln:NCUA VDP', 'acc:bugcrowd');

  // tools
  for (const t of tools) {
    add({ id: `tool:${t.name}`, type: 'tool', label: t.name, size: 0.38, desc: tr(t.desc, lang), href: t.repo ?? t.href });
    link('tr0p', `tool:${t.name}`);
    if ((t.repo ?? t.href).includes('github.com/marcostolosa')) link(`tool:${t.name}`, 'acc:github');
  }

  // writeups
  for (const w of writeups.slice(0, 4)) {
    add({ id: `wr:${w.id}`, type: 'writeup', label: w.title.length > 34 ? `${w.title.slice(0, 33)}…` : w.title, size: 0.36, desc: w.summary, href: `/writeups/${w.id}/` });
    link('tr0p', `wr:${w.id}`);
  }

  return layout(nodes, edges);
}

/** Seeded PRNG so every build produces the same picture. */
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function layout(raw: Omit<GNode, 'depth' | 'p'>[], edges: [number, number][]): Graph {
  const n = raw.length;
  const rnd = mulberry(0x7230);
  const adj: number[][] = raw.map(() => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });

  const depth = new Array(n).fill(-1);
  depth[0] = 0;
  for (const q = [0]; q.length; ) {
    const i = q.shift()!;
    for (const j of adj[i]) if (depth[j] < 0) { depth[j] = depth[i] + 1; q.push(j); }
  }

  const p = raw.map((_, i) => (i === 0 ? [0, 0, 0] : [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1]));
  for (let it = 0; it < 600; it++) {
    const cool = 1 - it / 600;
    const f = p.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = [p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]];
        const r2 = Math.max(0.01, d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        const k = 0.9 / (r2 * Math.sqrt(r2));
        for (let c = 0; c < 3; c++) { f[i][c] += d[c] * k; f[j][c] -= d[c] * k; }
      }
    }
    for (const [a, b] of edges) {
      const d = [p[b][0] - p[a][0], p[b][1] - p[a][1], p[b][2] - p[a][2]];
      const r = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) || 0.001;
      // leaves hug their hub; hubs keep their distance from the centre
      const rest = a === 0 || b === 0 ? (adj[a === 0 ? b : a].length > 2 ? 1.9 : 1.35) : 0.85;
      const k = (r - rest) * 0.35 / r;
      for (let c = 0; c < 3; c++) { f[a][c] += d[c] * k; f[b][c] -= d[c] * k; }
    }
    for (let i = 1; i < n; i++) for (let c = 0; c < 3; c++) p[i][c] += Math.max(-0.2, Math.min(0.2, f[i][c] - p[i][c] * 0.02)) * (0.25 + cool * 0.75);
  }
  // flatten a little: the hero is wider than it is tall
  let max = 0;
  for (const q of p) { q[1] *= 0.72; max = Math.max(max, Math.hypot(q[0], q[1], q[2])); }
  // open up the crowded centre: remap radius r -> r^0.62 so inner nodes move outwards
  for (const q of p) {
    const r = Math.hypot(q[0], q[1], q[2]) / max;
    const k = r > 0 ? Math.pow(r, 0.62) / r : 0;
    for (let c = 0; c < 3; c++) q[c] *= k;
  }
  const r3 = (v: number) => Math.round((v / max) * 1000) / 1000;
  return {
    nodes: raw.map((nd, i) => ({ ...nd, depth: depth[i], p: [r3(p[i][0]), r3(p[i][1]), r3(p[i][2])] as [number, number, number] })),
    edges,
  };
}
