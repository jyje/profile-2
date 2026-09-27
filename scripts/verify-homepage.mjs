import assert from 'node:assert/strict';
import path from 'node:path';
import http from 'node:http';
import handler from 'serve-handler';
import {chromium} from 'playwright';

const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
const server = http.createServer((request, response) => {
  if (!request.url.startsWith(prefix)) {response.writeHead(404).end(); return;}
  request.url = '/' + request.url.slice(prefix.length);
  void handler(request, response, {public: path.resolve('build'), cleanUrls: true});
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const errors = [];

try {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', reducedMotion: 'reduce'});
    await context.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const root = origin + prefix + (locale === 'en' ? 'en/' : '');
    assert.equal((await page.goto(root, {waitUntil: 'networkidle'})).status(), 200);
    await page.evaluate(() => document.fonts.ready);

    const navigation = page.locator('main nav');
    const labels = locale === 'ko' ? ['블로그', '위키', '실험실', '소개'] : ['Blog', 'Wiki', 'Labs', 'About'];
    assert.deepEqual(await navigation.locator('a').allTextContents(), labels);
    for (const [index, link] of (await navigation.locator('a').all()).entries()) {
      const href = await link.getAttribute('href');
      const expected = new URL(['blog', 'wiki', 'labs', 'about'][index], root).pathname;
      assert.equal(href.replace(/\/$/, ''), expected);
      assert.equal((await page.request.get(new URL(href, root).href)).status(), 200);
    }

    assert.equal(await page.locator('main h1').count(), 1);
    assert.deepEqual(await page.locator('main h1 > span').allTextContents(), ['Jeayoung Jeon', '(전제영)']);
    for (const id of ['home-featured', 'home-reading', 'home-wiki', 'home-daily']) {
      assert.equal(await page.locator(`#${id}`).count(), 1, `${locale}: missing curated section ${id}`);
    }
    assert.ok(await page.locator('section[aria-labelledby="home-reading"] ol a').count() > 0);

    // Measure the intro and menu at a narrow phone width, the reference phone width, and desktop.
    // Editorial content below the intro is variable and is not part of this layout contract.
    for (const width of [320, 390, 1222]) {
      await page.setViewportSize({width, height: 900});
      const measurements = await page.evaluate(() => {
        const textRects = (element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()].map(({left, right, top, bottom}) => ({left, right, top, bottom}));
        };
        const identity = document.querySelector('main > section[aria-labelledby="home-title"] > p');
        const names = [...document.querySelectorAll('main h1 > span')];
        const links = [...document.querySelectorAll('main nav a')].map((element) => {
          const box = element.getBoundingClientRect();
          return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, text: textRects(element)};
        });
        return {identity: textRects(identity), names: names.map(textRects), links};
      });

      const label = `${locale} ${width}px`;
      const nameLines = [['title', measurements.identity], ...measurements.names.map((lines, index) => [`name ${index + 1}`, lines])];
      for (const [name, lines] of nameLines) {
        assert.equal(lines.length, 1, `${label}: ${name} breaks across lines`);
        assert(lines[0].left >= 0 && lines[0].right <= width + 1, `${label}: ${name} escapes viewport`);
      }
      for (const [index, link] of measurements.links.entries()) {
        assert(link.bottom - link.top >= 44, `${label}: small touch target`);
        assert(link.text.length > 0 && link.text.every((line) => line.left >= link.left - 1 && line.right <= link.right + 1), `${label}: label escapes target`);
        for (const other of measurements.links.slice(index + 1)) {
          assert(link.right <= other.left + 1 || other.right <= link.left + 1 || link.bottom <= other.top + 1 || other.bottom <= link.top + 1, `${label}: targets overlap`);
        }
      }
    }

    await page.setViewportSize({width: 390, height: 900});
    await navigation.locator('a').first().focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(), labels[1]);
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname.replace(/\/$/, '') === new URL('wiki', root).pathname);
    await context.close();
    console.log(`Homepage verified: ${locale}, intro and navigation at 320px, 390px and 1222px; curated sections and keyboard navigation.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
