import { expect, test, type Page } from '@playwright/test';
import { disclosures } from '../src/data/profile';
import { pages } from './pages';

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

  test('graph inspector opens on the CVSS 10.0 finding and links to its source', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#insp-title')).toHaveText('CVE-2025-10230');
    await expect(page.locator('#insp-src')).toHaveAttribute('href', disclosures[0].href);
    // WebGL scene when available, static SVG otherwise: either way the hero settles into one of the two states.
    await expect(page.locator('#whoami')).toHaveClass(/\b(gl|no-gl)\b/);
  });

  test('next / previous walk every node and wrap', async ({ page }) => {
    test.slow(); // CI renders WebGL in software
    await page.goto('/');
    const count = page.locator('#insp-count');
    const total = Number((await count.textContent())!.split('/')[1]);
    const first = await page.locator('#insp-title').textContent();
    const seen = new Set<string>();
    for (let i = 0; i < total; i++) {
      seen.add((await page.locator('#insp-title').textContent())!);
      await page.locator('#next').click();
    }
    expect(seen.size).toBe(total);
    await expect(page.locator('#insp-title')).toHaveText(first!);
    await page.locator('#prev').click();
    await expect(page.locator('#insp-title')).not.toHaveText(first!);
  });

  test('a linked node opens from the inspector and every node cites a source', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await page.locator('#insp-links button', { hasText: 'Samba' }).click();
    await expect(page.locator('#insp-title')).toHaveText('Samba');
    await expect(page.locator('#insp-links button', { hasText: 'CVE-2025-10230' })).toBeVisible();
    const total = Number((await page.locator('#insp-count').textContent())!.split('/')[1]);
    for (let i = 0; i < total; i++) {
      await expect(page.locator('#insp-src')).toHaveAttribute('href', /^(https:\/\/|mailto:|\/|#)/);
      await page.locator('#next').click();
    }
  });

  test('the graph works with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#next').click();
    await expect(page.locator('#insp-title')).not.toHaveText('CVE-2025-10230');
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
    for (const p of pages.filter((x) => !x.path.includes('fixture') && !('single' in x))) {
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
  test.slow(); // loads the WebGL home page several times; CI renders it in software
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

test('every image on the site opens full screen and zooms', async ({ page }) => {
  // big enough that the screenshots have to be scaled up to fill it
  if (!page.viewportSize() || page.viewportSize()!.width > 1000) await page.setViewportSize({ width: 2560, height: 1440 });
  const vp = page.viewportSize()!;
  const routes = new Set<string>(pages.map((p) => p.path));
  for (const index of ['/writeups/', '/pt-br/writeups/']) {
    await page.goto(index);
    for (const href of await page.locator('main a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) routes.add(href);
  }
  let seen = 0;
  for (const route of routes) {
    await page.goto(route);
    const imgs = page.locator('img:not(dialog.lb img)');
    const n = await imgs.count();
    if (!n) continue;
    const dlg = page.locator('dialog.lb');
    await expect(dlg, route).toBeAttached();
    const big = dlg.locator('.lb-view img');
    for (let i = 0; i < n; i++) {
      const img = imgs.nth(i);
      const where = `${route} img #${i}`;
      await expect(img, where).toHaveAttribute('role', 'button');
      await img.scrollIntoViewIfNeeded();
      await img.click();
      await expect(dlg, where).toBeVisible();
      const d = (await dlg.boundingBox())!;
      expect(d.width, where).toBeGreaterThanOrEqual(vp.width - 1);
      expect(d.height, where).toBeGreaterThanOrEqual(vp.height - 1);
      // fitted: touches the screen edge in one direction and overflows in neither
      const b = (await big.boundingBox())!;
      expect(b.width, where).toBeLessThanOrEqual(vp.width + 1);
      expect(b.height, where).toBeLessThanOrEqual(vp.height + 1);
      expect(Math.max(b.width / vp.width, b.height / vp.height), where).toBeGreaterThan(0.99);
      await expect(dlg.locator('output')).toHaveText('100%');
      await page.keyboard.press('+');
      await expect(dlg.locator('output')).toHaveText('150%');
      await expect.poll(async () => (await big.boundingBox())!.width, { message: where }).toBeGreaterThan(b.width * 1.45);
      await dlg.locator('[data-a="fit"]').click();
      await expect(dlg.locator('output')).toHaveText('100%');
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(img).toBeFocused();
      seen++;
    }
  }
  expect(seen).toBeGreaterThan(0);
});
