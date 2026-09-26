import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import handler from 'serve-handler';
import {chromium} from 'playwright';

const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
const directory = path.resolve(process.env.VERIFY_BUILD_DIR ?? 'build');
const server = http.createServer((request, response) => {
  if (!request.url.startsWith(prefix)) { response.writeHead(404); response.end(); return; }
  request.url = '/' + request.url.slice(prefix.length);
  void handler(request, response, {public: directory, cleanUrls: true});
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + prefix;
const browser = await chromium.launch();
try {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US'});
    await context.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    const page = await context.newPage();
    const root = base + (locale === 'en' ? 'en/' : '');
    const response = await page.goto(root + 'wiki/guide/obsidian-authoring');
    assert.ok(response.ok());
    const connections = page.getByRole('complementary', {name: locale === 'ko' ? '문서 연결' : 'Content connections'});
    await connections.waitFor();
    const graphLink = connections.getByRole('link', {name: locale === 'ko' ? '그래프에서 보기' : 'Explore in graph'});
    assert.ok((await graphLink.getAttribute('href')).startsWith(new URL(root).pathname + 'wiki/graph?node='));
    await graphLink.click();
    await page.getByRole('button', {name: locale === 'ko' ? '주변 문서' : 'Nearby notes', exact: true}).waitFor();
    assert.match(page.url(), /wiki\/graph\?node=/);
    await page.goto(root + 'tags/kubernetes');
    assert.ok(await page.locator('main a[href*="/blog/"]').count() > 0);
    assert.ok(await page.locator('main a[href*="/wiki/"]').count() > 0);
    const cvLink = page.locator('main a[href*="/about/cv#"]').first();
    const href = await cvLink.getAttribute('href');
    await cvLink.click();
    await page.locator('[data-career-document="cv"]').waitFor();
    assert.ok(await page.locator(`[id="${href.split('#')[1]}"]`).count());
    for (const width of [390, 864, 1222]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(root + 'about/resume');
      await page.locator('[data-career-document="resume"]').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `horizontal overflow at ${locale}/${width}`);
    }
    await context.close();
    // Static/API access is served as addressed, without language redirection.
    const raw = await fetch(root + 'about/cv'); assert.equal(raw.status, 200);
    assert.equal(raw.url, root + 'about/cv');
  }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/export-career-pdfs.mjs'], {stdio: 'inherit', env: {...process.env, PDF_BASE_URL: base}});
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`PDF validation failed (${code})`)));
  });
  console.log('Both locales: cross-content links, graph entry, CV anchors, mobile widths, static routes and PDFs passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
