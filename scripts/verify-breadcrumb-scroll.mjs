import assert from 'node:assert/strict';

// Called by the existing bilingual breadcrumb gate, and therefore by the real
// staged-index pre-commit gate. Only synthetic test labels are injected.
export async function verifyBreadcrumbScroll(page, root, screenshots, locale) {
  const routes = ['wiki/d/portfolio/widearth-digital-twins-platforms-at-maxst/', 'about/portfolio/'];
  const list = page.locator('[data-breadcrumb-scroller] ul.breadcrumbs');
  const back = page.locator('[data-breadcrumb-back]');
  const forward = page.locator('[data-breadcrumb-forward]');
  const metrics = () => list.evaluate(node => ({left: node.scrollLeft, max: node.scrollWidth - node.clientWidth}));
  const tail = async () => {await list.evaluate(node => {node.scrollLeft = node.scrollWidth;}); await back.waitFor({state: 'visible'});};
  const home = () => list.locator('.breadcrumbs__item:first-child svg').boundingBox();
  const fits = async () => {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await list.evaluate(node => {
      const tops = [...node.children].map(item => item.getBoundingClientRect().top);
      return Math.max(...tops) - Math.min(...tops) <= 2;
    }), 'All breadcrumb items remain on one row');
  };
  for (const width of [390, 864, 1222]) {
    await page.setViewportSize({width, height: 900});
    for (const theme of ['light', 'dark']) {
      for (const route of routes) {
        await page.goto(root + route);
        await page.evaluate(theme => {document.documentElement.dataset.theme = theme;}, theme);
        await list.waitFor();
        // Force a genuinely long chain even on desktop, without making extra
        // public routes. Existing native wiki/custom links and schema stay intact.
        await list.evaluate(node => {
          for (const link of node.querySelectorAll('.breadcrumbs__item:not(:first-child) .breadcrumbs__link')) {
            link.textContent += ' Long synthetic navigation label'.repeat(4);
          }
          const current = node.querySelector('.breadcrumbs__item--active');
          const parent = node.children[1];
          for (let i = 0; i < 4; i++) {
            const ancestor = parent.cloneNode(true);
            ancestor.classList.remove('breadcrumbs__item--active');
            node.insertBefore(ancestor, current);
          }
        });
        await back.waitFor({state: 'visible'});
        await fits();
        const initial = await metrics();
        assert.ok(initial.max > 0 && Math.abs(initial.left - initial.max) <= 1, 'Initially reveal the current item');
        assert.equal(await forward.isVisible(), false);
        const anchor = await home();
        const current = list.locator('.breadcrumbs__item--active .breadcrumbs__link');
        assert.equal(await current.evaluate(node => node.title), await current.textContent());
        assert.ok(await current.evaluate(node => node.scrollWidth > node.clientWidth), 'Long title is visually abbreviated');
        const filename = `${screenshots}/${locale}-${width}-${theme}-${route.startsWith('wiki') ? 'wiki' : 'custom'}-scroll.png`;
        await page.locator('[data-breadcrumb-frame]').screenshot({path: filename, animations: 'disabled'});
        await back.click();
        await page.waitForFunction(before => document.querySelector('ul.breadcrumbs').scrollLeft < before, initial.left);
        await forward.waitFor({state: 'visible'});
        await forward.click();
        await tail();
        // Desktop mouse drag must scroll, never navigate to the pressed link.
        const box = await list.boundingBox();
        const url = page.url();
        await page.mouse.move(box.x + box.width - 60, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2, {steps: 12});
        await page.mouse.up();
        assert.ok((await metrics()).left < initial.left - 20, `Mouse drag scrolls toward earlier paths: ${locale}/${width}/${theme}/${route}, initial=${JSON.stringify(initial)}, after=${JSON.stringify(await metrics())}`);
        assert.equal(page.url(), url, 'Dragging must not navigate');
        assert.deepEqual(await home(), anchor, 'Sticky Home geometry survives scrolling');
        if (width === 390) {
          await tail();
          const control = await back.boundingBox();
          const start = control.x + control.width / 2;
          await page.mouse.move(start, control.y + control.height / 2);
          await page.mouse.down();
          await page.mouse.move(start + 60, control.y + control.height / 2, {steps: 12});
          await page.mouse.up();
          const after = (await metrics()).left;
          assert.ok(after < initial.left - 40 && after > initial.left - 100, 'Ellipsis drag must not also click');
          assert.equal(page.url(), url);
        }
        await tail();
        await page.mouse.move(box.x + box.width - 70, box.y + box.height / 2);
        await page.mouse.wheel(-100, 0);
        await page.waitForFunction(before => document.querySelector('ul.breadcrumbs').scrollLeft < before - 10, initial.left);
        await tail();
        await page.keyboard.down('Shift');
        await page.mouse.wheel(0, -100);
        await page.keyboard.up('Shift');
        await page.waitForFunction(before => document.querySelector('ul.breadcrumbs').scrollLeft < before - 10, initial.left);
        // Tab focus reveals an offscreen parent, then ordinary activation works.
        await tail();
        await list.locator('a').first().focus();
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const node = document.activeElement;
          const box = node.getBoundingClientRect();
          const list = node.closest('ul.breadcrumbs').getBoundingClientRect();
          return {href: node.getAttribute('href'), visible: box.left >= list.left + 55 && box.right <= list.right};
        });
        assert.ok(focused.visible, 'Keyboard parent link must be visible');
        await page.keyboard.press('Enter');
        await page.waitForURL(new URL(focused.href, url).href);
      }
    }
  }
  await page.setViewportSize({width: 390, height: 900});
  await page.goto(root + routes[0]);
  await back.waitFor({state: 'visible'});
  await page.setViewportSize({width: 1222, height: 900});
  await back.waitFor({state: 'hidden'});
  assert.equal(await forward.isVisible(), false, 'No overflow controls when the path fits');
  await page.setViewportSize({width: 390, height: 900});
  await back.waitFor({state: 'visible'});
  await fits();
  assert.ok(Math.abs((await metrics()).left - (await metrics()).max) <= 1, 'Resize reveals current item again');
  // Real touch input in a touch-capable Chromium context, not scrollLeft mutation.
  const touchContext = await page.context().browser().newContext({hasTouch: true, isMobile: true,
    viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await touchContext.addCookies(await page.context().cookies());
  const touch = await touchContext.newPage();
  try {
    await touch.goto(root + routes[0]);
    await touch.locator('[data-breadcrumb-back]').waitFor();
    const trail = touch.locator('ul.breadcrumbs');
    const bounds = await trail.boundingBox();
    const cdp = await touchContext.newCDPSession(touch);
    const swipe = async (x, distance) => {
      const y = bounds.y + bounds.height / 2;
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
      for (let step = 1; step <= 12; step++) {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + distance * step / 12, y}]});
        await touch.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    const before = await trail.evaluate(node => node.scrollLeft);
    // Keep the entire native gesture inside the viewport and outside controls.
    await swipe(bounds.x + bounds.width - 165, 110);
    await touch.waitForFunction(before => document.querySelector('ul.breadcrumbs').scrollLeft < before - 20, before);
    await trail.evaluate(node => {node.scrollLeft = node.scrollWidth;});
    const edge = touch.locator('[data-breadcrumb-back]');
    await edge.waitFor();
    const control = await edge.boundingBox();
    const edgeBefore = await trail.evaluate(node => node.scrollLeft);
    // The ellipsis itself must forward a swipe, not jump or activate its button.
    await swipe(control.x + control.width / 2, 80);
    const edgeAfter = await trail.evaluate(node => node.scrollLeft);
    assert.ok(edgeAfter < edgeBefore - 40 && edgeAfter > edgeBefore - 130, `Ellipsis swipe scrolls without also clicking: before=${edgeBefore}, after=${edgeAfter}`);
    assert.equal(touch.url(), root + routes[0], 'Touch swipe must not navigate');
    await touch.screenshot({path: `${screenshots}/${locale}-390-touch.png`, animations: 'disabled'});
  } finally {await touchContext.close();}

  // SSR/no-JS retains all links in a usable native scroller, with no fake controls.
  const staticContext = await page.context().browser().newContext({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  const staticPage = await staticContext.newPage();
  try {
    await staticPage.goto(root + routes[0]);
    assert.ok(await staticPage.locator('ul.breadcrumbs a').count() >= 3);
    assert.equal(await staticPage.locator('[data-breadcrumb-back]').isVisible(), false);
    assert.ok(await staticPage.locator('ul.breadcrumbs').evaluate(node => getComputedStyle(node).overflowX === 'auto'));
    await staticPage.screenshot({path: `${screenshots}/${locale}-390-no-js.png`, animations: 'disabled'});
  } finally {await staticContext.close();}
}
