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

FIRST VIEWPORT: A debugger paused at a breakpoint. Sticky toolbar (brand TR0P.dbg, Run F9 -> connect, Step F8 -> next section, Writeups, state 'Paused in whoami()'). Left CPU pane: breakpoint comment, name at display scale with Tr0p in amber, one-line method, primary action 'Open an engagement', then the disclosures listing with the instruction pointer on CVE-2025-10230 (10.0) and the next line pre-marked. Right column: Registers pane carrying the numbers (RIP = CVE-2025-10230 CVSS 10.0, RAX = 6 HoF, RBX = 15 valid, RCX = 93.75%), Stack pane carrying the tools. Log pane and status bar close the frame.

FORM: Disassembler world (user-chosen over the assigned Declassified Dossier); surface structure 'debugger session', dealt lead (THE ROLL) of the surface round, candidate 4 of 7, locked by the user. seed:9d98c709b0bef3c2

Raises: from algorave-source-floor (declined) the next instruction is visibly queued before Step executes it; from nixie-laboratory-counter (declined) every quantity sits in a fixed-width tabular register.

Signature interaction: Step/Run debugger control (F8/n steps the instruction pointer section by section, F9 runs to connect, status bar tracks the current function on scroll). Secondary: xref highlight — hovering/focusing any symbol highlights every other occurrence of that symbol on the page (as in IDA), e.g. "samba" lights up both Samba findings. Motion grammar: one caret blink in the hero (disabled under reduced motion), 180ms exponential ease-out on row highlight; nothing else animates.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
