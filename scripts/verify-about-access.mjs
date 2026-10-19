import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function verifyAboutAccess(browser, base) {
  const origin = new URL(base).origin;
  const errors = [];
  fs.mkdirSync('.playwright-mcp/about-access', {recursive: true});
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', reducedMotion: 'reduce'});
    await context.route('**/__dev_all_events', route => route.abort());
    await context.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const root = base + (locale === 'en' ? 'en/' : '');
    const labels = locale === 'ko' ? ['개요', '포트폴리오', '이력서'] : ['Overview', 'Portfolio', 'Resume'];
    const routes = ['about/', 'about/portfolio/', 'about/resume/', 'about/selected-cv/', 'about/cv/'];
    for (const [index, route] of routes.entries()) {
      for (const width of [390, 864, 1222]) {
        await page.setViewportSize({width, height: 1000});
        for (const theme of ['light', 'dark']) {
          assert.equal((await page.goto(root + route)).status(), 200);
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          await page.evaluate(() => document.fonts.ready);
          const nav = page.locator('[data-about-nav]');
          assert.equal(await nav.count(), 1);
          assert.deepEqual(await nav.locator('a').allTextContents(), labels);
          assert.equal(await nav.locator('[aria-current="page"]').count(), 1);
          assert.equal(await nav.locator('[aria-current="page"]').innerText(), labels[Math.min(index, 2)]);
          assert.equal(await page.locator('.site-breadcrumbs').count(), 1);
          assert.equal(await page.locator('[data-career-document],[data-career-role],input[type="email"],form').count(), 0);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${route}/${width}: overflow`);
          for (const link of await nav.locator('a').all()) {
            const href = await link.getAttribute('href');
            assert.ok(new URL(href, root).href.startsWith(root));
            assert.ok((await page.request.get(new URL(href, root).href)).ok());
          }
          if (route === 'about/portfolio/') {
            assert.equal(await page.locator('main .about-case').count(), 3);
            for (const link of await page.locator('main .about-case a').all()) {
              assert.ok((await page.request.get(new URL(await link.getAttribute('href'), root).href)).ok());
            }
          }
          if (route === 'about/resume/') {
            const contact = page.locator('main a[href="https://www.linkedin.com/in/jyje"]');
            assert.equal(await contact.count(), 1);
            assert.equal(await contact.getAttribute('target'), '_blank');
          }
          await nav.locator('a').first().focus();
          assert.ok(await nav.locator('a').first().evaluate(node => node === document.activeElement));
          if (width === 390 || width === 1222) await page.screenshot({path: `.playwright-mcp/about-access/${locale}-${route.replaceAll('/', '-')}-${width}-${theme}.png`, fullPage: true});
        }
      }
      const staticResponse = await page.request.get(root + route + '?role=unknown&next=https://untrusted-return.invalid/#old-anchor');
      const html = await staticResponse.text();
      assert.equal(staticResponse.status(), 200);
      assert.match(html, /data-about-nav/);
      if (index >= 2) assert.match(html, /data-about-access/);
      assert.doesNotMatch(html, /data-career-document|src\/generated\/resume/);
      assert.ok(!html.includes('https://untrusted-return.invalid/'));
    }
    for (const route of ['resume/', ...(locale === 'ko' ? ['ko/resume/'] : [])]) {
      assert.equal((await page.goto(root + route)).status(), 200);
      await page.waitForURL(url => url.pathname.replace(/\/$/, '') === new URL('about/resume', root).pathname);
      await page.locator('[data-about-access]').waitFor();
    }
    await page.goto(root + 'about/resume/?role=unknown&next=https://untrusted-return.invalid/#old-anchor');
    assert.equal(await page.locator('main a[href*="untrusted-return.invalid"]').count(), 0);
    // Keyboard navigation and actual touch input use normal anchors.
    await page.locator('[data-about-nav] a').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.waitForURL(root + 'about/portfolio/');
    const touch = await browser.newContext({hasTouch: true, viewport: {width: 390, height: 900}});
    await touch.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    const mobile = await touch.newPage();
    await mobile.goto(root + 'about/');
    await mobile.locator('[data-about-nav] a').nth(2).tap();
    await mobile.waitForURL(root + 'about/resume/');
    await touch.close();
    const noScript = await browser.newContext({javaScriptEnabled: false});
    const staticPage = await noScript.newPage();
    for (const route of ['about/resume/', 'about/cv/', 'about/selected-cv/']) {
      assert.equal((await staticPage.goto(root + route)).status(), 200);
      assert.equal(await staticPage.locator('[data-about-access]').count(), 1);
      assert.equal(await staticPage.locator('[data-career-document]').count(), 0);
      assert.equal(await staticPage.locator('[data-about-nav] a').count(), 3);
    }
    await noScript.close();
    await context.close();
    console.log(`About access verified: ${locale}, 5 routes, 3 widths, 2 themes, aliases, keyboard and touch.`);
  }
  assert.deepEqual(errors, []);
}
