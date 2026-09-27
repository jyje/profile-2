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
    const labels = locale === 'ko'
      ? ['소개', '이력서', '블로그', '경험', '성취', '위키', '실험실']
      : ['About', 'Resume', 'Blog', 'Careers', 'Achievements', 'Wiki', 'Labs'];
    assert.deepEqual(await navigation.locator('a').allTextContents(), labels);
    for (const [index, link] of (await navigation.locator('a').all()).entries()) {
      const href = await link.getAttribute('href');
      const expected = new URL(['about', 'about/resume', 'blog', 'tags/careers', 'tags/achievements', 'wiki', 'labs'][index], root).pathname;
      assert.equal(href.replace(/\/$/, ''), expected);
      assert.equal(await link.locator('svg').count(), 1, `${locale}: missing navigation icon`);
      assert.equal((await page.request.get(new URL(href, root).href)).status(), 200);
    }

    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('main h1').innerText(), 'jyje.online');
    assert.equal(await page.title(), 'jyje.online');
    assert.equal(await page.locator('#home-author').innerText(), locale === 'ko'
      ? '- AI 플랫폼 엔지니어 전제영'
      : '- Jeayoung Jeon, AI Platform Engineer');
    assert.equal(await page.locator('#home-author strong').innerText(), locale === 'ko' ? '전제영' : 'Jeayoung Jeon');
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
        const title = document.querySelector('main h1');
        const author = [...document.querySelectorAll('#home-author > span, #home-author strong')];
        const links = [...document.querySelectorAll('main nav a')].map((element) => {
          const box = element.getBoundingClientRect();
          const icon = element.querySelector('svg').getBoundingClientRect();
          return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, iconLeft: icon.left, iconRight: icon.right};
        });
        return {title: textRects(title), author: author.map(textRects), links};
      });

      const label = `${locale} ${width}px`;
      const nameLines = [['title', measurements.title], ...measurements.author.map((lines, index) => [`author ${index + 1}`, lines])];
      for (const [name, lines] of nameLines) {
        assert.equal(lines.length, 1, `${label}: ${name} breaks across lines`);
        assert(lines[0].left >= 0 && lines[0].right <= width + 1, `${label}: ${name} escapes viewport`);
      }
      for (const [index, link] of measurements.links.entries()) {
        assert(link.bottom - link.top >= 44, `${label}: small touch target`);
        assert(link.iconLeft >= link.left && link.iconRight <= link.right, `${label}: icon escapes target`);
        assert(link.left >= 0 && link.right <= width + 1, `${label}: menu escapes viewport`);
        assert(Math.abs(link.top - measurements.links[0].top) <= 1, `${label}: menu wraps onto another row`);
        for (const other of measurements.links.slice(index + 1)) {
          assert(link.right <= other.left + 1 || other.right <= link.left + 1 || link.bottom <= other.top + 1 || other.bottom <= link.top + 1, `${label}: targets overlap`);
        }
      }
    }

    await page.setViewportSize({width: 390, height: 900});
    await navigation.locator('a').first().focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('title'), labels[1]);
    assert.equal(await page.locator(':focus').evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname.replace(/\/$/, '') === new URL('about/resume', root).pathname);
    await context.close();
    console.log(`Homepage verified: ${locale}, intro and navigation at 320px, 390px and 1222px; curated sections and keyboard navigation.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
