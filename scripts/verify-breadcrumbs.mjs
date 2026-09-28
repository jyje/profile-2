import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import handler from 'serve-handler';
import {chromium} from 'playwright';

const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
let origin = process.env.VERIFY_ORIGIN;
let server;
if (!origin) {
  server = http.createServer((request, response) => {
    if (!request.url.startsWith(prefix)) {response.writeHead(404).end(); return;}
    request.url = '/' + request.url.slice(prefix.length);
    void handler(request, response, {public: path.resolve('build'), cleanUrls: true});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch();
const screenshots = '.playwright-mcp/breadcrumbs';
fs.mkdirSync(screenshots, {recursive: true});
const selector = '.site-breadcrumbs, .theme-doc-breadcrumbs';
const errors = [];
async function context(locale) {
  const ctx = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', viewport: {width: 1222, height: 900}});
  await ctx.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
  await ctx.route('**/__dev_all_events', route => route.abort());
  return ctx;
}
try {
  for (const locale of ['ko', 'en']) {
    const ctx = await context(locale);
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => {errors.push(error.message); console.error(`Page error (${page.url()}): ${error.message}`);});
    const root = origin + prefix + (locale === 'en' ? 'en/' : '');
    const ko = locale === 'ko';
    const blog = ko ? '블로그' : 'Blog', about = ko ? '소개' : 'About', tags = ko ? '전체 태그' : 'All tags';
    const routes = [
      ['wiki/', [ko ? '🏠 위키 홈' : '🏠 Wiki Home']],
      ['wiki/d/argo-cd/', [ko ? '🏠 위키 홈' : '🏠 Wiki Home', ko ? '📚 문서' : '📚 Documents', '📄 Argo CD']],
      ['wiki/_tag-archives/', [tags]], ['wiki/_tag-archives/kubernetes/', [tags, 'Kubernetes']],
      ['blog/', [blog]],
      ['blog/kcsa-kubernetes-and-cloud-native-security-associate/', [blog, 'KCSA: Kubernetes and Cloud Native Security Associate (2025)']],
      ['blog/archive/', [blog, ko ? '아카이브' : 'Archive']],
      ['blog/authors/', [blog, ko ? '작성자' : 'Authors']],
      ['blog/_tag-archives/kubernetes/', [tags, 'Kubernetes']],
      ['about/', [about]],
      ['about/selected-cv/', [about, ko ? '경력기술서' : 'Selected CV']],
      ['about/cv/', [about, ko ? '전체 CV' : 'Full CV']],
      ['about/portfolio/', [about, ko ? '포트폴리오' : 'Portfolio']],
      ['tags/', [tags]], ['tags/kubernetes/', [tags, 'Kubernetes']],
      ['search/?q=kubernetes', [ko ? '검색' : 'Search']],
    ];
    for (const [route, expected] of routes) {
      console.log(`Checking ${locale} ${route}`);
      const response = await page.goto(root + route);
      assert.equal(response.status(), 200, route);
      const nav = page.locator(selector);
      await nav.waitFor();
      assert.equal(await nav.count(), 1, `${locale} ${route}: exactly one breadcrumb`);
      assert.deepEqual((await nav.locator('.breadcrumbs__link').allTextContents()).slice(1), expected, `${locale} ${route}`);
      assert.equal(await nav.locator('.breadcrumbs__item--active a,.breadcrumbs__item--active button').count(), 0);
      const links = await nav.locator('a').evaluateAll(nodes => nodes.map(node => node.href));
      assert.equal(new URL(links[0]).pathname, new URL(root).pathname);
      for (const link of links) {
        assert.ok(link.startsWith(root), `Locale/base escaped: ${link}`);
        assert.ok((await page.request.get(link)).ok(), `Broken breadcrumb link: ${link}`);
      }
      const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)).filter(item => item['@type'] === 'BreadcrumbList'));
      assert.equal(schemas.length, 1, `Duplicate or missing schema: ${route}`);
      assert.deepEqual(schemas[0].itemListElement.map(item => item.name).slice(1), expected, `Schema labels: ${route}`);
    }
    for (const width of [390, 864, 1222]) {
      await page.setViewportSize({width, height: 900});
      for (const theme of ['light', 'dark']) {
        console.log(`Checking ${locale} ${width}px ${theme}`);
        const response = await page.goto(root + 'wiki/d/argo-cd/');
        assert.equal(response.status(), 200);
        assert.equal(new URL(page.url()).pathname, new URL(root + 'wiki/d/argo-cd/').pathname);
        await page.locator(selector).waitFor();
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await page.locator(selector).screenshot({path: `${screenshots}/${locale}-${width}-${theme}.png`, animations: 'disabled'});
        await page.goto(root + 'about/portfolio/');
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await page.locator(selector).evaluate(nav => {nav.querySelector('.breadcrumbs__item--active span').textContent = 'LongTitle'.repeat(35);});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${locale} ${width}`);
        await page.locator(`${selector.split(',')[0]} a`).first().focus();
        assert.ok(await page.locator('.site-breadcrumbs a').first().evaluate(node => node === document.activeElement));
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        await page.waitForURL(root + 'about/');
      }
    }
    for (const route of ['', 'about/resume/', 'no-such-breadcrumb-page/']) {
      await page.goto(root + route);
      assert.equal(await page.locator(selector).count(), 0, 'Home/404 must not gain a breadcrumb');
    }
    await page.goto(root + 'labs/');
    await page.locator('.site-breadcrumbs').waitFor();
    assert.equal(await page.locator(selector).count(), 1);
    assert.match(await page.locator(selector).innerText(), ko ? /실험실/ : /Labs/);
    for (const variant of ['resume', 'selected-cv', 'cv']) {
      await page.goto(root + `about/${variant}/`);
      await page.emulateMedia({media: 'print'});
      assert.equal(await page.locator(selector).isVisible(), false, 'Breadcrumb must not print');
      await page.emulateMedia({media: 'screen'});
    }
    await ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log('Breadcrumbs passed: all page families, both locales, schema, links, base path, 3 widths, themes, keyboard, long titles, home/404 and print.');
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
