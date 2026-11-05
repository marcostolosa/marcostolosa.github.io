---
name: Tr0p.dbg
description: Personal site of Marcos Tolosa (Tr0p), built as a debugger paused at a breakpoint.
colors:
  bg: "#0f1013"
  gutter: "#15171b"
  panel: "#1a1d22"
  panel-2: "#20242a"
  line: "#2a2e36"
  fg: "#dad6cb"
  fg-hi: "#f2eee3"
  dim: "#9aa1ad"
  addr: "#8a92a1"
  kw: "#e8b861"
  str: "#a6c98e"
  num: "#e0a283"
  cmt: "#a0adc1"
  sym: "#8cbde8"
  crit: "#ec7b70"
typography:
  display:
    fontFamily: "Red Hat Display Variable, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 6.4vw, 5.6rem)"
    fontWeight: 900
    lineHeight: 0.93
    letterSpacing: "-0.035em"
  heading:
    fontFamily: "Red Hat Display Variable, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Red Hat Display Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.5
  prose:
    fontFamily: "Red Hat Display Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
  listing:
    fontFamily: "Red Hat Mono Variable, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
spacing:
  pad: "clamp(20px, 5vw, 64px)"
  row: "6px"
  section: "34px"
components:
  button-primary:
    backgroundColor: "{colors.kw}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "15px 20px"
  button-primary-hover:
    backgroundColor: "#f1c77a"
    textColor: "{colors.bg}"
  toolbar-button:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "7px 10px"
  severity-chip:
    backgroundColor: "{colors.num}"
    textColor: "{colors.bg}"
    rounded: "{rounded.sm}"
    padding: "4px 7px"
  severity-chip-critical:
    backgroundColor: "{colors.crit}"
    textColor: "{colors.bg}"
  pane-header:
    backgroundColor: "{colors.gutter}"
    textColor: "{colors.addr}"
    padding: "8px {spacing.pad}"
---

## Overview

The site is a binary under analysis in a debugger, paused at a breakpoint in `whoami()`. Sections are functions with addresses, links are xrefs, numbers live in registers, tools sit on the stack. The visitor can drive it: **Step** (F8 / `n`) advances the instruction pointer section by section, **Run** (F9) continues to `connect()`. It is still a page: everything reads and works by plain scrolling and clicking.

Two type voices only: Red Hat Display for names, headings and prose; Red Hat Mono for listings, data and code. Mono never sets running prose.

## Colors

Warm graphite ground, parchment text, and IDA-style token colours that each carry one job:

- `kw` amber: mnemonics, the handle, the primary action, the current function. The only warm accent at scale.
- `str` sage: string literals (finding classes, agency names).
- `sym` sky: xrefs and links.
- `num` / `crit`: severity chips. `crit` only for CVSS ≥ 9 or P1.
- `cmt` slate: `;` comments, AAA contrast on `bg`.
- `addr` grey: addresses and pane chrome, tabular numerals.

## Typography

Display at 900 with tight tracking for the name and the closing question; heading 800 for function titles (lowercase, snake_case, the function's real name). Prose at 1.125rem/1.75, max 70ch. Listing rows at 15px mono, addresses in tabular numerals.

## Layout

IDE panes separated by 1px `line` gaps, full-bleed, no outer container: CPU pane (hero + disclosures) beside a Registers/Stack column at ≥960px, stacked below. Bands below the CPU (hall_of_fame, writeups), then Log, then connect, then the status bar. Sticky toolbar on top. Page gutter is `spacing.pad`.

## Elevation & Depth

Flat. Depth comes from ground steps (`bg` → `gutter` → `panel` → `panel-2`), never from glow. The only shadow is the primary button's neutral drop (`0 8px 18px -10px rgba(0,0,0,.8)`). Toolbar uses an 8px backdrop blur because content scrolls under it.

## Shapes

Small radii only (2–6px). Instruction-pointer marker is an authored SVG triangle; next-instruction marker an SVG chevron plus a 2px amber inset rule.

## Components

- **Toolbar**: brand `TR0P.dbg`, Run/Step buttons with `kbd` hints, live state "Paused in fn()".
- **Listing row**: marker · address · body · optional severity chip. Current row tinted `hl`; next row with inset amber rule.
- **Registers**: `dt` register name, `dd` value + `;` comment. `RIP` in `crit`.
- **Stack entry**: address, tool name (display 800), one-line description, tags.
- **Status bar**: current function, binary, method, "authorized targets only".
- **Xref highlight**: any `[data-sym]` lights up every other element with the same symbol on hover or focus.

Motion: 180ms exponential ease-out on hover tints; smooth scroll on Step (instant under reduced motion); a blinking caret is not used. Nothing else animates.

## Do's and Don'ts

- Do link every claim to a public record. Never invent clients, testimonials, response times, bounty amounts.
- Do keep `translate="no"` on listings and identifiers.
- Do add new sections as functions with an address and a `data-step` name.
- Don't add neon green, glows, typing-terminal heroes or badge rows; that is the category default this site refuses.
- Don't use emoji or Unicode glyphs as icons; draw SVG.
- Don't set prose in mono.
