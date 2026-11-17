// The site must come up on every engine and machine, including the bad days: no GPU, a page cached from the
// previous deploy, a request that never finishes. Runs on every project in playwright.config.ts.
import { expect, test, type Page } from '@playwright/test';
import { pages } from './pages';

/** Whether this browser can create a WebGL context at all (some headless WebKit builds cannot). */
const hasWebGL = (page: Page) => page.evaluate(() => !!document.createElement('canvas').getContext('webgl'));

/** Errors the page itself raised, ignoring third parties the test environment blocks. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/googletagmanager|clarity\.ms|cloudflareinsights|favicon|WebGL|GPU stall|GL_|swiftshader/i.test(t)) return;
    errors.push(`console: ${t}`);
  });
  page.on('response', (r) => {
    const u = new URL(r.url());
    if (r.status() >= 400 && u.origin === new URL(page.url() || 'http://x').origin) errors.push(`${r.status()} ${u.pathname}`);
  });
  return errors;
}

test.describe('every page loads cleanly', () => {
  for (const p of pages) {
    test(`${p.path}: no errors, no failed requests, content visible`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(p.path);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('home graph', () => {
  test.describe.configure({ retries: 2 });
  test('the 3D graph starts on its own, with no interaction', async ({ page }) => {
    // The visitor who only presses F5 and looks: the scene must arrive without a mouse move,
    // even on a CPU renderer (there it waits a few seconds so the page settles first).
    test.slow();
    const errors = collectErrors(page);
    await page.goto('/pt-br/');
    const hero = page.locator('#whoami');
    if (await hasWebGL(page)) {
      await expect(hero).toHaveClass(/(^|\s)gl(\s|$)/, { timeout: 20_000 });
      await expect(hero.locator('canvas')).toBeVisible();
    } else {
      await expect(hero).toHaveClass(/(^|\s)no-gl(\s|$)/, { timeout: 20_000 });
    }
    expect(errors).toEqual([]);
  });

  test('the first interaction starts it right away', async ({ page, isMobile }) => {
    test.skip(isMobile, 'pointer moves are a desktop gesture; touch is covered by the timer test');
    await page.goto('/en-us/');
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    await page.waitForTimeout(400);
    await page.mouse.move(500, 400);
    await page.mouse.move(520, 420);
    await expect(page.locator('#whoami')).toHaveClass(/(^|\s)gl(\s|$)/, { timeout: 8_000 });
  });

  test('the static graph works before and without WebGL', async ({ page }) => {
    // Before the scene starts (or where it never can) the SVG and the inspector carry the section.
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error narrowing the overloads is not the point here
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        return /webgl/.test(type) ? null : orig.call(this, type, ...rest);
      };
    });
    const errors = collectErrors(page);
    await page.goto('/en-us/');
    const hero = page.locator('#whoami');
    await expect(hero).toHaveClass(/(^|\s)no-gl(\s|$)/, { timeout: 10_000 });
    await expect(hero.locator('.fallback')).toBeVisible();
    const count = page.locator('#insp-count');
    const before = Number((await count.textContent())!.split('/')[0]);
    await page.locator('#next').click();
    await expect(count).toHaveText(new RegExp(`^${before + 1} /`));
    expect(errors).toEqual([]);
  });

  test('a page cached from the previous deploy recovers on its own', async ({ page }) => {
    test.info().annotations.push({ type: 'retries', description: 'Firefox under Playwright can stall a script-driven reload on a loaded machine' });
    // The graph chunk 404s once, as when the HTML is older than the files on the server: the page reloads
    // itself and the graph comes up, instead of waiting for the visitor to force a refresh.
    test.slow();
    let failed = 0;
    await page.route(/\/_astro\/osint-graph\.[^/]+\.js/, (route) => (failed++ === 0 ? route.fulfill({ status: 404, body: '' }) : route.continue()));
    await page.goto('/en-us/');
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    await page.mouse.move(300, 300).catch(() => {});
    await expect(page.locator('#whoami')).toHaveClass(/(^|\s)gl(\s|$)/, { timeout: 25_000 });
    expect(failed).toBeGreaterThanOrEqual(2);
  });

  test('a request that never finishes does not hold the graph back', async ({ page }) => {
    // An ad blocker or a slow third party can keep the load event from ever firing.
    test.slow();
    await page.route(/\/_astro\/.*\.woff2$/, () => { /* never answered */ });
    await page.goto('/en-us/', { waitUntil: 'domcontentloaded' });
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    await expect(page.locator('#whoami')).toHaveClass(/(^|\s)(gl|no-gl)(\s|$)/, { timeout: 25_000 });
    await page.mouse.move(300, 300).catch(() => {});
    await expect(page.locator('#whoami')).toHaveClass(/(^|\s)gl(\s|$)/, { timeout: 25_000 });
  });

  test('reloading many times always brings the graph back', async ({ page }) => {
    test.slow();
    await page.goto('/pt-br/');
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.mouse.move(200 + i * 10, 300).catch(() => {});
      await expect(page.locator('#whoami')).toHaveClass(/(^|\s)gl(\s|$)/, { timeout: 15_000 });
    }
  });
});

test.describe('backdrop', () => {
  test('the animated background comes up, or the gradient stays', async ({ page }) => {
    test.slow();
    await page.goto('/en-us/writeups/');
    const canvas = page.locator('#backdrop');
    if (await hasWebGL(page)) {
      await page.mouse.move(300, 300).catch(() => {});
      await expect(canvas).toHaveClass(/\bon\b/, { timeout: 20_000 });
    }
    // Either way the page background is never transparent.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor + getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)rgba(0, 0, 0, 0)');
  });
});

test.describe('backdrop motion', () => {
  // A screenshot cannot tell a frozen background from a moving one: count the frames actually drawn
  // while nobody touches the page, after the load has settled.
  const drawsIn = async (page: Page, ms: number) => {
    const a = await page.evaluate(() => (window as any).__draws as number);
    await page.waitForTimeout(ms);
    return (await page.evaluate(() => (window as any).__draws as number)) - a;
  };
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__draws = 0;
      const orig = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function (...a: Parameters<typeof orig>) {
        if ((this.canvas as HTMLCanvasElement).id === 'backdrop') (window as any).__draws++;
        return orig.apply(this, a);
      };
    });
  });

  for (const path of ['/en-us/writeups/', '/pt-br/']) {
    test(`${path}: the rain keeps falling with no input, even after load stalls`, async ({ page }) => {
      test.slow();
      await page.goto(path);
      test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
      // stall the main thread twice, as fonts, the graph and analytics do during load
      for (let i = 0; i < 3; i++) await page.evaluate(() => { const t = performance.now(); while (performance.now() - t < 350); });
      await expect(page.locator('#backdrop')).toHaveClass(/(^|\s)on(\s|$)/, { timeout: 20_000 });
      await page.waitForTimeout(5000);
      // a real GPU draws ~60 here; a CPU renderer also drawing the 3D graph manages a few, which is still motion
      expect(await drawsIn(page, 3000), 'frames drawn in 3 s').toBeGreaterThanOrEqual(2);
      await expect(page.locator('#backdrop')).not.toHaveAttribute('data-state', 'still');
    });
  }

  test('on a slow machine it degrades but still moves', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium devtools feature');
    test.slow();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.goto('/en-us/writeups/');
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    await expect(page.locator('#backdrop')).toHaveClass(/(^|\s)on(\s|$)/, { timeout: 30_000 });
    await page.waitForTimeout(8000);
    expect(await drawsIn(page, 4000), 'frames drawn in 4 s').toBeGreaterThanOrEqual(6);
  });

  test('reduced motion: drawn once, then still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/en-us/writeups/');
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
    await expect(page.locator('#backdrop')).toHaveClass(/(^|\s)on(\s|$)/, { timeout: 20_000 });
    await page.waitForTimeout(2000);
    expect(await drawsIn(page, 2000)).toBeLessThanOrEqual(1);
  });
});

test.describe('contact', () => {
  test('email and WhatsApp are reachable on every page size', async ({ page }) => {
    await page.goto('/pt-br/');
    for (const sel of ['#mail', '#wa']) {
      const a = page.locator(sel);
      await a.scrollIntoViewIfNeeded();
      await expect(a).toBeVisible();
      const box = (await a.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44); // touch target
    }
    await expect(page.locator('#wa')).toHaveAttribute('target', '_blank');
  });
});
