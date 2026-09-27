import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import handler from 'serve-handler';
import {chromium} from 'playwright';

const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
const output = path.resolve(process.env.VERIFY_BUILD_DIR ?? 'build');
const development = process.env.SITE_CONTENT_MODE === 'development';
let origin = process.env.VERIFY_ORIGIN;
let server;
if (!origin) {
  server = http.createServer((request, response) => {
    if (!request.url.startsWith(prefix)) { response.writeHead(404).end(); return; }
    request.url = '/' + request.url.slice(prefix.length);
    void handler(request, response, {public: output, cleanUrls: true});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch();
const screenshots = path.resolve('.playwright-mcp/wiki-completion');
fs.mkdirSync(screenshots, {recursive: true});
try {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US'});
    await context.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    // Capture simulation state in the test context only, without shipping debug hooks.
    await context.addInitScript(() => {
      let library;
      Object.defineProperty(window, 'd3', {
        configurable: true, get: () => library,
        set(value) {
          library = new Proxy(value, {get(target, key) {
            if (key !== 'forceSimulation') return target[key];
            return (...args) => {
              window.__testGraphNodes = args[0];
              window.__testGraphSimulation = target[key](...args);
              return window.__testGraphSimulation;
            };
          }});
        },
      });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const root = origin + prefix + (locale === 'en' ? 'en/' : '');
    // Directory-index routes must also preserve authored body links, not just
    // navigation links derived from graph metadata. Test both address forms.
    for (const route of ['blog/kcsa-kubernetes-and-cloud-native-security-associate', 'blog/kcna-kubernetes-and-cloud-native-associate', 'wiki/d/k8s', 'wiki/d/container', 'wiki/d/cncf', 'wiki/d/linux-foundation']) {
      for (const suffix of ['', '/']) {
        await page.goto(root + route + suffix);
        assert.ok(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname.endsWith('/'), 'Canonical URLs must match directory-index hosting');
        const links = await page.locator('article .markdown a[href]').evaluateAll(anchors => anchors
          .map(a => new URL(a.getAttribute('href'), location.href).href)
          .filter(href => new URL(href).origin === location.origin));
        assert.ok(links.length > 0, `Missing body links on ${route}`);
        for (const href of new Set(links)) {
          assert.ok(new URL(href).pathname.startsWith(new URL(root).pathname), `Locale/base path lost: ${href}`);
          assert.equal((await page.request.get(href)).status(), 200, `Broken body link from ${page.url()}: ${href}`);
        }
      }
    }
    await page.goto(root + 'wiki/knowledge/argo-cd/?check=1#definition');
    await page.waitForURL(url => /\/wiki\/d\/argo-cd\/?$/.test(url.pathname), {timeout: 15000});
    assert.equal(new URL(page.url()).search, '?check=1'); assert.equal(new URL(page.url()).hash, '#definition');
    assert.match(await page.locator('h1').innerText(), /^📄 Argo CD/);
    assert.match(await page.locator('.breadcrumbs').innerText(), locale === 'en' ? /📚 Documents/ : /📚 문서/);
    const local = page.locator('[data-document-graph="local"]');
    await local.scrollIntoViewIfNeeded();
    await local.locator('canvas').waitFor({timeout: 30000});
    const options = await local.locator('option').allTextContents();
    assert.ok(options.some(label => label.includes('Argo Project')));
    assert.ok(options.some(label => label.startsWith('#')));
    assert.ok(!options.some(label => label.includes('Argo Events')));
    assert.equal(await page.locator('.theme-last-updated time').count(), 1);
    if (locale === 'en') assert.match(await page.locator('article').innerText(), /English version unavailable/i);
    const canvas = local.locator('canvas');
    const before = await local.locator('select').inputValue();
    const node = await page.evaluate(() => {
      window.__testGraphSimulation.stop();
      const node = window.__testGraphNodes.find(node => !node.isTag && !node.id.replace(/\/$/, '').endsWith('/argo-cd'));
      return {id: node.id, x: node.x, y: node.y};
    });
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2 + node.x, bounds.y + bounds.height / 2 + node.y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + node.x + 50, bounds.y + bounds.height / 2 + node.y + 25, {steps: 10});
    const pinned = await page.evaluate(id => { const n = window.__testGraphNodes.find(node => node.id === id); return {x: n.fx, y: n.fy}; }, node.id);
    assert.ok(pinned.x != null && Math.abs(pinned.x - node.x) > 25, 'drag moves and pins the target node');
    await page.mouse.up();
    assert.equal(await local.locator('select').inputValue(), before, 'drag must not select or navigate');
    // Native popup keyboard handling is OS-specific; use Playwright's native
    // selection helper, then verify keyboard access to the resulting link.
    await local.locator('select').selectOption({index: 1});
    assert.notEqual(await local.locator('select').inputValue(), before);
    await local.locator('select').focus(); await page.keyboard.press('Tab');
    assert.ok(await local.locator('a').evaluate(link => document.activeElement === link));
    assert.ok(await local.locator('a').getAttribute('href'));
    for (const width of [390, 864, 1222]) {
      await page.setViewportSize({width, height: 900});
      await local.scrollIntoViewIfNeeded();
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${width}/${theme} overflow`);
        await local.getByRole('button', {name: locale === 'ko' ? '확대' : 'Zoom in', exact: true}).click();
        if (width === 390) await local.screenshot({path: path.join(screenshots, `${locale}-${theme}-local.png`)});
      }
    }
    await page.goto(root + 'blog/recap-2025/');
    const postGraph = page.locator('[data-document-graph="local"]');
    await postGraph.scrollIntoViewIfNeeded(); await postGraph.locator('canvas').waitFor({timeout: 30000});
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => document.querySelector('[data-graph-state]')?.getAttribute('data-graph-state') === 'paused');
    await postGraph.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-graph-state]')?.getAttribute('data-graph-state') === 'active');
    await page.goto(root + 'blog/'); assert.equal(await page.locator('[data-document-graph]').count(), 0);
    const oldNode = `wiki:${new URL(root).pathname}wiki/knowledge/argo-cd`;
    await page.goto(root + `wiki/graph/?node=${encodeURIComponent(oldNode)}`);
    await page.waitForURL(url => url.pathname.endsWith('/wiki/') && url.hash === '#document-graph');
    assert.equal(new URL(page.url()).searchParams.get('node'), oldNode);
    const global = page.locator('[data-document-graph="global"]');
    await global.scrollIntoViewIfNeeded(); await global.locator('canvas').waitFor({timeout: 30000});
    assert.equal(await page.locator('[data-document-graph="local"]').count(), 0);
    assert.match(await page.locator('h1').innerText(), /^🏠 /);
    assert.ok(await global.getByRole('button', {name: locale === 'ko' ? '주변 문서' : 'Nearby notes', exact: true}).getAttribute('aria-pressed') === 'true');
    await page.setViewportSize({width: 390, height: 900}); await global.screenshot({path: path.join(screenshots, `${locale}-home.png`)});
    for (const section of ['guide/publication', 'design/resume']) {
      const response = await page.goto(root + `wiki/${section}/`);
      if (development) {
        assert.equal(response.status(), 200);
        assert.match(await page.locator('article .theme-admonition').first().innerText(), /개발 전용 문서|DEVELOPMENT-ONLY DOCUMENT/);
        assert.equal(await page.locator('[data-document-graph="local"]').count(), 1);
      } else assert.equal(response.status(), 404);
    }
    assert.deepEqual(errors, [], `${locale} page errors`);
    await context.close();
  }
  const context = await browser.newContext({locale: 'en-US', reducedMotion: 'reduce', hasTouch: true, viewport: {width: 390, height: 844}});
  await context.addCookies([{name: 'jyje_locale', value: 'en', url: origin}]);
  const page = await context.newPage();
  await page.route('**/cdn.jsdelivr.net/**', route => route.abort());
  await page.goto(origin + prefix + 'en/wiki/d/argo-cd/');
  const local = page.locator('[data-document-graph="local"]'); await local.scrollIntoViewIfNeeded();
  await local.getByRole('button', {name: 'Retry', exact: true}).waitFor();
  assert.ok(await page.locator('aside a[href*="/wiki/d/"]').count() > 0);
  await page.unroute('**/cdn.jsdelivr.net/**');
  await local.getByRole('button', {name: 'Retry', exact: true}).tap();
  await local.locator('canvas').waitFor({timeout: 30000});
  await local.getByRole('button', {name: 'Zoom in', exact: true}).tap();
  await context.close();
  const delayedContext = await browser.newContext({locale: 'en-US'});
  await delayedContext.addCookies([{name: 'jyje_locale', value: 'en', url: origin}]);
  // Accelerate only the graph's initial loading deadline, then let retry use the
  // normal deadline while the original requests finish. No production hooks.
  await delayedContext.addInitScript(() => {
    window.__testShortDeadline = true;
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => schedule(callback, delay === 20000 && window.__testShortDeadline ? 200 : delay, ...args);
  });
  const delayedPage = await delayedContext.newPage();
  const held = [];
  await delayedPage.route('**/cdn.jsdelivr.net/**', route => { held.push(route); });
  await delayedPage.goto(origin + prefix + 'en/wiki/d/argo-cd/');
  const delayedGraph = delayedPage.locator('[data-document-graph="local"]');
  await delayedGraph.scrollIntoViewIfNeeded();
  await delayedGraph.getByRole('button', {name: 'Retry', exact: true}).waitFor();
  assert.equal(await delayedPage.locator('script[src*="cdn.jsdelivr.net"]').count(), 2);
  await delayedPage.evaluate(() => { window.__testShortDeadline = false; });
  await delayedGraph.getByRole('button', {name: 'Retry', exact: true}).click();
  assert.equal(await delayedPage.locator('script[src*="cdn.jsdelivr.net"]').count(), 2, 'retry must not duplicate timed-out scripts');
  await Promise.all(held.map(route => route.continue()));
  await delayedGraph.locator('canvas').waitFor({timeout: 30000});
  await delayedContext.close();
  console.log(`Wiki integration passed (${development ? 'development' : 'public'}): both locales, legacy routes, inline/global graphs, drag, keyboard, responsive themes, pause/resume, retry and touch/reduced motion.`);
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
