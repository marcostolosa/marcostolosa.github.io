import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Writeups live in src/content/writeups/*.md(x). Files starting with "_" are ignored (templates).
// WRITEUP_FIXTURES=1 (CI test build only) also loads tests/fixtures/writeups so the article template is exercised.
const patterns = ['src/content/writeups/**/[^_]*.{md,mdx}'];
if (process.env.WRITEUP_FIXTURES === '1') patterns.push('tests/fixtures/writeups/**/[^_]*.{md,mdx}');

const writeups = defineCollection({
  loader: glob({
    pattern: patterns,
    base: '.',
    generateId: ({ entry }) => entry.split('/').pop()!.replace(/\.mdx?$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['en', 'pt-br']).default('en'),
    target: z.string().optional(),
    cve: z.string().optional(),
    severity: z.string().optional(),
    tags: z.array(z.string()).default([]),
    pair: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { writeups };
