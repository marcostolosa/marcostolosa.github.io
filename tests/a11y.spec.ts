import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { homeSections } from '../src/data/profile';
import { pages, WCAG } from './pages';

const scan = async (page: Page, include?: string) => {
  let b = new AxeBuilder({ page }).withTags(WCAG);
  if (include) b = b.include(include);
  const { violations } = await b.analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
  expect(summary, `axe violations${include ? ` in ${include}` : ''}`).toEqual([]);
};

for (const p of pages) {
  test.describe(`page ${p.path}`, () => {
    test('has no WCAG 2.2 AA violations', async ({ page }) => {
      await page.goto(p.path);
      await scan(page);
    });

    test('declares its language, one h1 and a skip link', async ({ page }) => {
      await page.goto(p.path);
      await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('a.skip')).toHaveAttribute('href', '#main');
      await expect(page.locator('main#main')).toHaveCount(1);
    });

    test('does not scroll sideways', async ({ page }) => {
      await page.goto(p.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

test('404 page is accessible', async ({ page }) => {
  const res = await page.goto('/this-address-is-not-mapped/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Out of scope.');
  await scan(page);
});

for (const home of ['/', '/pt-br/']) {
  test.describe(`sections on ${home}`, () => {
    for (const id of homeSections) {
      test(`#${id} renders, is labelled and passes axe`, async ({ page }) => {
        await page.goto(home);
        const s = page.locator(`#${id}`);
        await s.scrollIntoViewIfNeeded();
        await expect(s).toBeVisible();
        if (id === 'whoami') await expect(s.locator('h1')).toBeVisible();
        else await expect(s.locator('h2')).toBeVisible();
        await scan(page, `#${id}`);
      });
    }

    test('stays accessible after walking the graph', async ({ page }) => {
      await page.goto(home);
      for (let i = 0; i < 6; i++) await page.locator('#next').click();
      await page.locator('#insp-links button').first().click();
      await scan(page);
    });
  });
}
