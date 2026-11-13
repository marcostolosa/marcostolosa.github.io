---
version: 2
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/writeups/index.astro"]
---

# Surface brief — home (mindsecurity.org /)

Scope: home page + writeups index/article template + 404. Visitor mode: Persuade (clients first, recruiters second, community third). Primary action: email to open an engagement. Proof: six linkable disclosures, 6x U.S. Gov HoF, tools.

Replaces v1 (debugger / disassembler world). The user asked for a pentest / red team / bug bounty / OSINT identity and explicitly not reverse engineering, with three.js-level visual ambition.

## Direction contract

THESIS: Run OSINT on me. The site is a link-analysis investigation whose subject is Tr0p himself; every claim is a node, every node opens the public source that proves it.

OWN-WORLD: Night navy ground (#0b1226), never neutral black. Colour encodes entity type and nothing else: person white, vulnerability coral (#ff6b5e), target gold (#ffc857), account cyan (#5fd4e6), tool violet (#a998ff), writeup green (#97e08a). One family, Bricolage Grotesque Variable, condensed (wdth 75) and heavy for names and headings, regular width for reading. Red Hat Mono only for identifiers, hosts, dates and code.

STORY: Visitor sees the name and a living graph, reads "you don't have to take my word for it", clicks a node, lands on a real advisory, and emails.

FIRST VIEWPORT: three.js scene (src/scripts/osint-graph.ts). Subject node in a rotating wireframe cage at the centre of three range rings; findings, targets, accounts, tools and writeups around it; packets travel along edges; bloom; distant dust. Copy on the left, node inspector bottom right (type, name, description, linked nodes, source), prev/next to walk the graph by keyboard. Opens on CVE-2025-10230.

DATA: src/data/graph.ts builds the graph from src/data/profile.ts, so hero and sections cannot disagree. Layout is computed at build time (seeded), which also yields the inline SVG fallback shown before WebGL loads and when it is unavailable.

Signature interaction: select a node (click, linked-node chip, prev/next): the graph turns to face it, a reticle locks on, its edges and neighbours light up, the inspector shows the source. Motion grammar: one intro (the graph grows outwards from the subject by graph depth), slow idle rotation, exponential ease-out everywhere; reduced motion gets the final state with no rotation or packets.

Quality floor: adaptive rendering (bloom, then resolution, then a few frames per second) so slow GPUs keep responsive input; canvas is aria-hidden and every fact in it is repeated in the sections below.

BACKDROP: no flat ground anywhere. src/scripts/backdrop.ts draws a site-wide recon map in a fragment shader (domain-warped terrain, contour lines with index lines, grain) fixed behind every page. It takes the colour of the section being read (data-tint), slides with scroll and carries a soft light under the pointer. Reading pages run it at about half strength (Base `quiet`). Without WebGL the <html> gradient remains.

SCROLL: on wide screens the graph scene is fixed behind the whole home page. Each section declares data-focus (a node type); the scene flies to that cluster, lights it, and drops out of focus (blur + low opacity) so the text stays the subject. Back at the top it returns to the interactive view. The scene canvas zeroes its alpha in a final pass, so it composites additively over the backdrop.

EMPHASIS: the CVSS 10.0 row is set at display scale; it is the strongest proof on the page.

HACKER PASS (user: "quero mais com cara de hacker"): the OWN-WORLD palette and type above are superseded. Ground is terminal black with a green cast (#050a08); phosphor green (#35f29a) is the voice (links, primary action, prompts); entity colours stay as type coding (vuln red #ff4d5e, target amber #ffb627, account cyan #3fd7ff, tool violet #c08bff, writeup green). One family: Red Hat Mono for everything. Shell prompts (tr0p@mindsecurity:~$ cmd) name the command each block answers and are aria-hidden; headings keep plain-language text. Backdrop adds glyph rain to the contour terrain; CRT scanlines sit over the page; the name decrypts on load and glitches every few seconds (off under reduced motion). The node inspector is a terminal window.
