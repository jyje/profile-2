import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import handler from 'serve-handler';
import {chromium} from 'playwright';
import {verifyAboutAccess} from './verify-about-access.mjs';
import {verifyPublicCareerBoundary} from './public-career-boundary.mjs';
import {verifyBlogSidebar} from './verify-blog-sidebar.mjs';
import {verifyNavbarOrder} from './verify-navbar-order.mjs';

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
    const response = await page.goto(root + 'wiki/d/');
    assert.ok(response.ok());
    const connections = page.getByRole('complementary', {name: locale === 'ko' ? '문서 연결' : 'Content connections'});
    await connections.waitFor();
    const graphLink = connections.getByRole('link', {name: locale === 'ko' ? '전체 그래프에서 보기' : 'Explore in the full graph'});
    assert.ok((await graphLink.getAttribute('href')).startsWith(new URL(root).pathname + 'wiki/?node='));
    await graphLink.click();
    await page.getByRole('button', {name: locale === 'ko' ? '주변 문서' : 'Nearby notes', exact: true}).waitFor();
    assert.match(page.url(), /wiki\/\?node=/);
    await page.goto(root + 'tags/kubernetes');
    assert.ok(await page.locator('main a[href*="/blog/"]').count() > 0);
    assert.ok(await page.locator('main a[href*="/wiki/"]').count() > 0);
    assert.equal(await page.locator('main a[href*="/about/cv#"],main a[href*="/about/cv/#"]').count(), 0);
    await context.close();
    // Static/API access is served as addressed, without language redirection.
    const raw = await fetch(root + 'about/cv'); assert.equal(raw.status, 200);
    assert.equal(raw.url, root + 'about/cv');
  }
  await verifyAboutAccess(browser, base);
  await verifyBlogSidebar(browser, base);
  await verifyNavbarOrder(browser, base);
  console.log(`Public career boundary: ${verifyPublicCareerBoundary(directory)} output files checked.`);
  console.log('Both locales: cross-content links, graphs, public About navigation, access gateways and static routes passed.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
