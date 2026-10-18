import assert from 'node:assert/strict';

export async function verifyBlogSidebar(browser, base) {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({reducedMotion: 'reduce'});
    // Dev-all reload notifications must not interrupt navigation assertions.
    await context.route('**/__dev_all_events', route => route.abort());
    await context.addCookies([{name: 'jyje_locale', value: locale, url: new URL(base).origin}]);
    const page = await context.newPage();
    const root = base + (locale === 'en' ? 'en/' : '');
    const sidebar = '.blog-wrapper .row > aside.col--3';
    for (const width of [390, 864, 1222]) {
      await page.setViewportSize({width, height: 900});
      for (const mode of ['list', 'grid']) {
        console.log(`Blog sidebar: ${locale}/${width}/${mode}`);
        await page.goto(root + 'blog/');
        await page.getByRole('button', {name: locale === 'ko' ? (mode === 'list' ? '목록' : '카드') : (mode === 'list' ? 'List' : 'Grid'), exact: true}).click();
        assert.equal(await page.locator(sidebar).count(), 0, `${locale}/${width}/${mode}: list sidebar`);
        assert.ok(await page.locator('main.col--9').count(), 'Native no-sidebar layout must reclaim space');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        const first = page.locator('main article a').first();
        const href = await first.getAttribute('href');
        // The listing has no hidden mobile Posts links either.
        assert.equal(await page.locator(`.navbar-sidebar a[href="${href}"]`).count(), 0);
        await first.click();
        await page.waitForURL(url => url.pathname.replace(/\/$/, '') === new URL(href, root).pathname.replace(/\/$/, ''));
        if (width >= 920) {
          await page.locator(sidebar).waitFor({state: 'visible'});
          assert.ok(await page.locator(`${sidebar} a`).count() > 0);
        } else {
          const toggle = page.locator('.navbar__toggle');
          const mobilePost = page.locator(`.navbar-sidebar a[href="${href}"]`).first();
          await mobilePost.waitFor({state: 'attached'});
          // Preserve the existing independent navbar/content breakpoints.
          if (await toggle.isVisible()) {
            await toggle.click();
            await mobilePost.waitFor({state: 'visible'});
            await page.locator('.navbar-sidebar__close').click();
          }
        }
        await page.goBack();
        await page.waitForURL(root + 'blog/');
        await page.getByRole('button', {name: locale === 'ko' ? '목록' : 'List', exact: true}).waitFor();
        await page.locator(sidebar).waitFor({state: 'detached'});
        await page.locator(`.navbar-sidebar a[href="${href}"]`).waitFor({state: 'detached'});
        assert.equal(await page.locator(sidebar).count(), 0, 'Sidebar must unmount on return to listing');
        assert.equal(await page.locator(`.navbar-sidebar a[href="${href}"]`).count(), 0);
      }
    }
    await context.close();
    console.log(`Blog sidebar verified: ${locale}, list/grid, 3 widths, article navigation and back.`);
  }
}
