---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: ["src/pages/writeups/index.astro"]
---

# Surface brief — home (mindsecurity.org /)

Scope: home page + writeups index/article template. Visitor mode: Persuade (clients first, recruiters second, community third). Primary action: email to open an engagement. Proof: six linkable disclosures, 6× U.S. Gov HoF, tools.

## Direction contract

THESIS: The site is a binary under analysis. Sections are functions, links are xrefs, proof is a listing you can follow. Refuses the category default of a typing-terminal hero with neon green, badge rows and same-size project cards.

OWN-WORLD: Warm graphite ground (#17191E), parchment-grey text, amber mnemonics, sage strings, slate comments, sky-blue symbols/xrefs; address gutter in dim grey. One display grotesk (Red Hat Display) for names and function titles; Red Hat Mono for listings, data and code only. Function sidebar with addresses, hairline separators, selection in amber. Writeups read as a decompiler pane: proportional body, mono only for code.

STORY: Visitor sees who and what in one line, sees the CVSS 10.0 finding immediately, understands every claim is a followable xref, and emails or reads a writeup.

FIRST VIEWPORT: Left 240px function rail (whoami, disclosures, hall_of_fame, tools, writeups, connect) with addresses. Main: comment line `; sub_401000 whoami()` + location, name at display scale with Tr0p in amber, one-line method, primary action "Open an engagement" (mailto) plus secondary "Read writeups", then the first disclosure row (CVE-2025-10230, 10.0) visible above the fold.

FORM: Disassembler listing, position 1 on the ordered list (IMPECCABLE'S PICK, chosen by the user over the assigned Declassified Dossier). seed:9d98c709b0bef3c2

Signature interaction: xref highlight — hovering/focusing any symbol highlights every other occurrence of that symbol on the page (as in IDA), e.g. "samba" lights up both Samba findings. Motion grammar: one caret blink in the hero (disabled under reduced motion), 180ms exponential ease-out on row highlight; nothing else animates.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
