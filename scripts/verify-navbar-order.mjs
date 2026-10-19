import assert from 'node:assert/strict';

export async function verifyNavbarOrder(browser, base) {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({reducedMotion: 'reduce'});
    await context.route('**/__dev_all_events', route => route.abort());
    await context.addCookies([{name: 'jyje_locale', value: locale, url: new URL(base).origin}]);
    try {
      const page = await context.newPage();
      const root = base + (locale === 'en' ? 'en/' : '');
      const expected = locale === 'ko' ? ['블로그', '위키', '실험실', '소개'] : ['Blog', 'Wiki', 'Labs', 'About'];
      const children = locale === 'ko' ? ['개요', '포트폴리오', '이력서'] : ['Overview', 'Portfolio', 'Resume'];
      for (const width of [390, 864, 1222]) {
        await page.setViewportSize({width, height: 900});
        await page.goto(root + 'blog/');
        // Wait for hydration before opening the native mobile menu.
        await page.getByRole('button', {name: locale === 'ko' ? '카드' : 'Grid', exact: true}).waitFor();
        const toggle = page.locator('.navbar__toggle');
        if (await toggle.isVisible()) {
          await toggle.click();
          const menu = page.locator('.navbar-sidebar__items > .navbar-sidebar__item').first();
          const rows = menu.locator(':scope > .menu__list > li');
          assert.deepEqual(await rows.locator(':scope > a, :scope > div > a').allTextContents(), [...expected, 'Language', 'GitHub']);
          const about = rows.nth(3);
          await about.locator('button.menu__caret').click();
          const links = about.locator(':scope > ul > li > a');
          await links.first().waitFor({state: 'visible'});
          assert.deepEqual(await links.allTextContents(), children);
          await page.locator('.navbar-sidebar__close').click();
        } else {
          const nav = page.locator('.navbar__inner > .navbar__items').first();
          assert.deepEqual(await nav.locator(':scope > a.navbar__link, :scope > .dropdown > .navbar__link').allTextContents(), expected);
          const about = nav.locator(':scope > .dropdown');
          await about.hover();
          const links = about.locator('.dropdown__menu a');
          await links.first().waitFor({state: 'visible'});
          assert.deepEqual(await links.allTextContents(), children);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        console.log(`Navbar order and About submenu: ${locale}/${width}`);
      }
    } finally {
      await context.close();
    }
  }
}
