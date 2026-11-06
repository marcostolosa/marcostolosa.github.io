import { expect, test, type Page } from '@playwright/test';
import { disclosures, stepSections } from '../src/data/profile';
import { pages } from './pages';

/** Wait until smooth scrolling has settled (scrollY unchanged across two frames ~150ms apart). */
const settled = (page: Page) =>
  expect
    .poll(async () => {
      const a = await page.evaluate(() => scrollY);
      await page.waitForTimeout(150);
      return a === (await page.evaluate(() => scrollY));
    })
    .toBe(true);

test.describe('home', () => {
  test('lists every disclosure with a link and a severity', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('#disclosures li');
    await expect(rows).toHaveCount(disclosures.length);
    for (const [i, d] of disclosures.entries()) {
      await expect(rows.nth(i).locator('a')).toHaveAttribute('href', d.href);
      await expect(rows.nth(i).locator('.sev')).toContainText(d.sev);
    }
  });

  test('primary action is a mailto link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#whoami a.btn')).toHaveAttribute('href', /^mailto:marcos\.tolosa@owasp\.org/);
    await expect(page.locator('#mail')).toHaveAttribute('href', /^mailto:/);
  });

  test('Step button walks every section in order and wraps', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#where')).toHaveText('whoami()');
    for (const id of [...stepSections.slice(1), stepSections[0]]) {
      await page.locator('#step').click();
      await settled(page);
      await expect(page.locator('#where')).toHaveText(`${id}()`);
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test('keyboard: n / F8 step, F9 runs to connect() and focuses the email', async ({ page, isMobile }) => {
    test.skip(isMobile, 'hardware keyboard shortcuts are desktop-only');
    await page.goto('/');
    await page.keyboard.press('n');
    await expect(page.locator('#where')).toHaveText('disclosures()');
    await page.keyboard.press('F8');
    await expect(page.locator('#where')).toHaveText('hall_of_fame()');
    await page.keyboard.press('F9');
    await expect(page.locator('#where')).toHaveText('connect()');
    await expect(page.locator('#mail')).toBeFocused();
  });

  test('Step respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#step').click();
    await expect(page.locator('#disclosures')).toBeInViewport();
  });
});

test.describe('keyboard and focus', () => {
  test('skip link is the first tab stop and moves to main', async ({ page, isMobile }) => {
    test.skip(isMobile, 'tab order is a desktop concern');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('a.skip');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('every tab stop shows a visible focus indicator', async ({ page, isMobile }) => {
    test.skip(isMobile, 'tab order is a desktop concern');
    await page.goto('/');
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const visible = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return true;
        const cs = getComputedStyle(el);
        return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      });
      expect(visible, `focus ring on tab stop ${i + 1}`).toBe(true);
    }
  });
});

test.describe('language switch', () => {
  test('EN ⇄ PT keeps the page and updates lang', async ({ page }) => {
    // Strip module scripts from every HTML response: the choice must be remembered even when
    // the visitor clicks before the page's module JS has run (seen in production).
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const res = await route.fetch();
      const body = (await res.text()).replace(/<script type="module"[\s\S]*?<\/script>/g, '');
      await route.fulfill({ response: res, body });
    });
    await page.goto('/writeups/');
    await page.locator('.lang a[data-lang="pt-br"]').click();
    await expect(page).toHaveURL((url) => url.pathname === '/pt-br/writeups/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.locator('.lang a[data-lang="pt-br"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('a.skip')).toHaveText('Pular para o conteúdo');

    await page.locator('.lang a[data-lang="en"]').click();
    // Exact path: a /\/writeups\/$/ regex would also match /pt-br/writeups/ and pass before navigating.
    await expect(page).toHaveURL((url) => url.pathname === '/writeups/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('en');
  });

  test('home content is translated', async ({ page }) => {
    await page.goto('/pt-br/');
    await expect(page.locator('#whoami a.btn')).toHaveText('Abrir um engajamento');
    await expect(page.locator('#h-con')).toHaveText('Tem algo no escopo?');
  });

  test('every page publishes hreflang alternates', async ({ page }) => {
    for (const p of pages.filter((x) => !x.path.includes('fixture'))) {
      await page.goto(p.path);
      await expect(page.locator('link[rel="alternate"][hreflang="en-US"]')).toHaveCount(1);
      await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveCount(1);
    }
  });

  test('Portuguese browser lands on /pt-br/ on first visit only', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'pt-BR' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/pt-br\/$/);
    await page.locator('.lang a[data-lang="en"]').click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await page.goto('/');
    await expect(page).toHaveURL(new URL('/', test.info().project.use.baseURL).href);
    await ctx.close();
  });

  test('English browser stays on /', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(new URL('/', test.info().project.use.baseURL).href);
    await ctx.close();
  });
});

// Status checks go through the browser (page.goto) so they follow the same network path as a visitor.
test('legacy tool landing pages still resolve', async ({ page }) => {
  for (const path of ['/ocrack.html', '/manw-ng.html', '/favicon.svg']) {
    expect((await page.goto(path))?.status(), path).toBe(200);
  }
});

test('every internal link resolves', async ({ page }) => {
  const seen = new Set<string>();
  for (const p of pages) {
    await page.goto(p.path);
    const hrefs = await page.$$eval('a[href^="/"]', (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!));
    hrefs.forEach((h) => seen.add(h.split('#')[0] || '/'));
  }
  for (const href of seen) {
    expect((await page.goto(href))?.status(), href).toBe(200);
  }
});
