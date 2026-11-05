# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Astro (static output on GitHub Pages, custom domain mindsecurity.org). The owner asked for "the most complete option, with the most room to grow" and plans to ship WebAssembly later. Astro gives static HTML by default, islands in any UI framework when interactivity is needed, Vite's native `.wasm` handling, and Markdown/MDX content collections for writeups. Deploy through a GitHub Actions build to Pages.

## Users

In priority order:

1. **Prospective clients** — companies evaluating a pentest, red team engagement, or security research contract. Job: decide in under a minute whether this person can be trusted with their scope, then make contact.
2. **Recruiters and hiring managers** for red team / AppSec / offensive research roles. Job: gauge seniority and real impact quickly, then reach out (LinkedIn or email).
3. **The community** — hackers, bug hunters, students. Job: read technical writeups, follow the YouTube channel and GitHub.

## Product Purpose

Personal site of Marcos Tolosa ("Tr0p"), an independent offensive security researcher based in Rio de Janeiro. It proves capability with verifiable public evidence (CVEs, government Hall of Fame entries, open-source tools) and hosts technical writeups. Success: inbound engagement emails first, recruiter contact second, community follows third.

## Positioning

Not a résumé of certifications: a ledger of real, linkable findings. A CVSS 10.0 command injection in Samba that stayed hidden for 13 years, a P1 unauthenticated RCE on U.S. federal infrastructure, six U.S. Government Hall of Fame entries. The method is "break → understand → automate → teach": each finding is taken apart to its root cause, automated into tooling, and written up so others can follow.

## Operating Context

Bug bounty platforms (Bugcrowd, HackerOne, YesWeHack, Intigriti), coordinated disclosure (GitHub Security Advisories, MITRE CVEs, Samba's GitLab), isolated labs and working PoCs, reverse engineering of binaries (IDA Pro, Ghidra, Radare2/Rizin, x64dbg, Frida), red team tooling (BloodHound, Impacket, Certipy, Rubeus, Havoc, Cobalt Strike), YouTube content on hacking and RE.

## Capabilities and Constraints

- Home page plus a writeups section (Markdown/MDX, added over time).
- Existing standalone tool landing pages must keep working at their URLs: `/ocrack.html`, `/manw-ng.html`.
- Custom domain via `CNAME` (mindsecurity.org) must be preserved.
- Future: WebAssembly-powered interactive pieces (undecided what).
- Bilingual audience (Brazilian + international); site copy is English today. Portuguese version: undecided.

## Brand Commitments

- Name and handle: "Marcos Tolosa", "Tr0p" (zero, not O).
- Voice: direct, pragmatic, no corporate fluff, a little irreverent; proof over claims ("logs on the console, concrete proof, zero bullshit").
- Always frames offensive work as authorized.

## Evidence on Hand

From the current site and GitHub README (all linkable):

- CVE-2025-10230 — Samba, OS command injection, CVSS 10.0, hidden 13 years.
- CVE-2026-23722 — WeGIA, stored XSS → RCE / UI redressing, CVSS 9.1.
- CVE-2025-67503 — WeGIA, reflected XSS, CVSS 8.2.
- NCUA VDP (Bugcrowd) — U.S. Government, unauthenticated OS command injection, P1.
- Digital Flanders (YesWeHack) — Belgian Government, blind XXE → internal SSRF (Tomcat Manager), High.
- Samba CTDB — buffer overflow in InfiniBand wrapper (unsafe sprintf), merged fix.
- 6× U.S. Government Hall of Fame: NASA, U.S. Dept. of Commerce, Dept. of Veterans Affairs, NCUA, EPA, U.S. Fish & Wildlife Service. 15 valid vulns, 93.75% accuracy (Bugcrowd profile bugcrowd.com/h/Tr0p).
- Tools: MANW-NG, OCRack (both have landing pages), ARCTAX, REload.Me, riskIA-service, OSCP Insights.
- Community: OWASP member since 2021, CVE Hunters member, YouTube @Marcos.Tolosa.
- Certifications listed: CRTA, CCEP, Advanced Prompt Hacking, CKS, CCSP, AWS Security Best Practices.
- Absent, never fabricate: client logos, testimonials, pricing, engagement counts, bounty amounts, photos.

## Product Principles

1. Proof before claims: every assertion links to a public record.
2. The visitor who can hire comes first; the community never gets a lesser experience.
3. Writing is part of the product: writeups must be a pleasure to read at length.
4. Fast and honest: static by default, interactivity only where it explains something.

## Accessibility & Inclusion

WCAG 2.1 AA. The owner is autistic (ASD level 1, stated publicly on the current site); avoid motion that cannot be disabled and respect `prefers-reduced-motion`.
