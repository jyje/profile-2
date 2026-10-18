import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import handler from 'serve-handler';
import {chromium} from 'playwright';
import {breadcrumbRule as rule, breadcrumbViolations} from './ux-lint-contract.mjs';

const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
const output = path.resolve(process.env.UX_LINT_OUTPUT ?? '.playwright-mcp/ux-lint/after');
const slug = value => value.replace(/[^a-z0-9-]/gi, '-');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
await fs.mkdir(output, {recursive: true});
let origin = process.env.VERIFY_ORIGIN;
let server;
if (!origin) {
  server = http.createServer((req, res) => {
    if (!req.url.startsWith(prefix)) {res.writeHead(404).end(); return;}
    req.url = '/' + req.url.slice(prefix.length);
    void handler(req, res, {public: path.resolve(process.env.VERIFY_BUILD_DIR ?? 'build'), cleanUrls: true});
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch();
const entries = [];
const canaries = [];
let fatal;

async function geometry(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('.site-breadcrumbs,.theme-doc-breadcrumbs')];
    const nav = all[0];
    const rect = node => {
      const r = node?.getBoundingClientRect();
      return r ? {x: r.x, y: r.y, width: r.width, height: r.height} : null;
    };
    const sidebars = [...document.querySelectorAll('.theme-doc-sidebar-container,.blog-wrapper .row > aside.col--3')]
      .filter(node => {const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).display !== 'none';});
    return {
      count: all.length, frames: document.querySelectorAll('[data-breadcrumb-frame]').length,
      nav: rect(nav), home: rect(nav?.querySelector('.breadcrumbs__item:first-child svg')),
      paneLeft: Math.max(0, ...sidebars.map(node => node.getBoundingClientRect().right)),
      navbarBottom: document.querySelector('.navbar').getBoundingClientRect().bottom,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      inHero: !!nav?.closest('.about-hero'),
    };
  });
}

// Inspect the captured pixels as well as DOM boxes. A hidden/replaced icon can
// retain its bounding box; measuring boxes alone would incorrectly pass it.
async function iconMask(page, png, g) {
  return page.evaluate(async ({data, x, y}) => {
    const img = new Image(); img.src = data; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 26;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, Math.floor(x) - 4, Math.floor(y) - 4, 26, 26, 0, 0, 26, 26);
    const pixels = ctx.getImageData(0, 0, 26, 26).data;
    const bg = [...pixels.slice(0, 3)];
    return Array.from({length: 26 * 26}, (_, i) =>
      Math.max(...bg.map((v, c) => Math.abs(v - pixels[i * 4 + c]))) > 35 ? 1 : 0);
  }, {data: `data:image/png;base64,${png.toString('base64')}`,
    x: g.paneLeft + rule.gutter + rule.home.x, y: g.navbarBottom + rule.gutter + rule.home.y});
}

function pixelViolation(mask, reference) {
  const ink = mask.reduce((a, b) => a + b, 0);
  const refInk = reference.reduce((a, b) => a + b, 0);
  const union = mask.reduce((sum, value, i) => sum + (value || reference[i] ? 1 : 0), 0);
  const difference = mask.reduce((sum, value, i) => sum + (value !== reference[i] ? 1 : 0), 0) / Math.max(1, union);
  return ink < refInk * 0.7 || ink > refInk * 1.3 || difference > 0.35
    ? `captured home pixels differ: ink=${ink}/${refInk}, mismatch=${difference.toFixed(3)}` : null;
}

try {
  for (const locale of rule.locales) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', deviceScaleFactor: 1, reducedMotion: 'reduce'});
    await context.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    await context.route('**/__dev_all_events', route => route.abort());
    const page = await context.newPage();
    const root = origin + prefix + (locale === 'en' ? 'en/' : '');
    for (const width of rule.widths) {
      await page.setViewportSize({width, height: 900});
      for (const theme of rule.themes) {
        let reference;
        for (const route of rule.routes) {
          const filename = `${locale}-${width}-${theme}-${slug(route)}.png`;
          const entry = {locale, width, theme, route, capture: filename, errors: []};
          entries.push(entry);
          try {
            const response = await page.goto(root + route);
            assert.equal(response.status(), 200, 'HTTP status');
            await page.locator('.site-breadcrumbs,.theme-doc-breadcrumbs').first().waitFor();
            await page.evaluate(async theme => {
              await document.fonts.ready;
              document.documentElement.dataset.theme = theme;
              window.scrollTo(0, 0);
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }, theme);
            const g = await geometry(page);
            entry.geometry = g;
            entry.errors.push(...breadcrumbViolations(g));
            const semantics = await page.evaluate(() => ({
              headings: document.querySelectorAll('main h1').length,
              unlabeledImages: document.querySelectorAll('main img:not([alt])').length,
            }));
            entry.semantics = semantics;
            if (semantics.headings > 1) entry.errors.push(`DS-004: duplicate primary headings (${semantics.headings})`);
            if (semantics.unlabeledImages) entry.errors.push(`DS-004: images without alt (${semantics.unlabeledImages})`);
            const png = await page.screenshot({path: path.join(output, filename), clip: {x: 0, y: 0, width, height: 240}, animations: 'disabled'});
            entry.sha256 = createHash('sha256').update(png).digest('hex');
            const mask = await iconMask(page, png, g);
            if (!reference) {
              assert.ok(mask.reduce((a, b) => a + b, 0) > 25, 'Wiki reference must contain a visible home glyph');
              reference = mask;
            }
            const pixels = pixelViolation(mask, reference);
            if (pixels) entry.errors.push(pixels);
            if (route === 'blog/capa-certified-argo-project-associate/') {
              const figure = page.locator('main figure');
              assert.equal(await figure.count(), 1, 'One schema-backed media figure');
              await figure.scrollIntoViewIfNeeded();
              await figure.locator('img').evaluate(image => image.decode());
              entry.detailsCapture = `figure-${filename}`;
              await figure.screenshot({path:path.join(output, entry.detailsCapture), animations:'disabled'});
              assert.ok(await figure.evaluate(node => node.getBoundingClientRect().width <= document.documentElement.clientWidth), 'Media figure fits narrow screens');
            }
            if (route === 'about/portfolio/' && locale === 'ko' && width === 1222 && theme === 'light') {
              for (const [name, css] of [
                ['vertical drift', '[data-breadcrumb-frame]{transform:translateY(8px)}'],
                ['horizontal drift', '[data-breadcrumb-frame]{transform:translateX(8px)}'],
                ['invisible icon', '.site-breadcrumbs svg{opacity:0}'],
              ]) {
                const style = await page.addStyleTag({content: css});
                const changed = await geometry(page);
                const shot = await page.screenshot({path: path.join(output, `canary-${slug(name)}.png`), clip: {x: 0, y: 0, width, height: 240}, animations: 'disabled'});
                const errors = [...breadcrumbViolations(changed), pixelViolation(await iconMask(page, shot, changed), reference)].filter(Boolean);
                canaries.push({name, detected: errors.length > 0, errors});
                assert.ok(errors.length, `Lint failed to catch ${name}`);
                await style.evaluate(node => node.remove());
              }
            }
          } catch (error) {
            entry.errors.push(error.message);
            if (!entry.sha256) {
              try {
                const png = await page.screenshot({path: path.join(output, filename), clip: {x: 0, y: 0, width, height: 240}, animations: 'disabled'});
                entry.sha256 = createHash('sha256').update(png).digest('hex');
              } catch (captureError) {entry.errors.push(`Capture unavailable: ${captureError.message}`);}
            }
          }
        }
        const homeEntry = {locale, width, theme, route:'', capture:`${locale}-${width}-${theme}-home.png`, errors:[], kind:'home-exception'};
        entries.push(homeEntry);
        try {
          assert.equal((await page.goto(root)).status(),200);
          await page.evaluate(async theme => {await document.fonts.ready;document.documentElement.dataset.theme=theme;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));},theme);
          assert.equal(await page.locator('.site-breadcrumbs,.theme-doc-breadcrumbs').count(),0,'Home omits its self breadcrumb');
          assert.equal(await page.locator('main h1').count(),1,'Home has one primary heading');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Home fits viewport');
          const png=await page.screenshot({path:path.join(output,homeEntry.capture),animations:'disabled'});
          homeEntry.sha256=createHash('sha256').update(png).digest('hex');
        } catch(error) {homeEntry.errors.push(error.message);}
        console.log(`UX-001 captured: ${locale}/${width}/${theme}`);
      }
    }
    // Explicit exceptions must stay breadcrumb-free, including after navigation.
    for (const route of ['', 'ux-lint-no-such-page/']) {
      await page.goto(root + route);
      assert.equal(await page.locator('.site-breadcrumbs,.theme-doc-breadcrumbs').count(), 0, route || 'home');
    }
    await context.close();
  }
} catch (error) {fatal = error.stack;}
finally {
  const failed = entries.filter(entry => entry.errors.length);
  const report = {rule: rule.id, generatedAt: new Date().toISOString(), origin, prefix, entries, canaries, fatal};
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  const html = `<!doctype html><meta charset="utf-8"><title>Profile design capture audit</title><style>body{font:14px system-ui;margin:20px}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}article{border:1px solid #aaa;padding:8px}img{width:100%}pre{white-space:pre-wrap;color:#a00}</style><h1>Design captures: ${failed.length} / ${entries.length} failed</h1><p>Coordinates are relative to the actual sidebar edge and navbar bottom. Captured pixels, drift canaries, title/alt checks and Home exceptions are mandatory. Inspect captures before sign-off.</p><section>${entries.map(e => `<article><b>${escape(`${e.locale} / ${e.width} / ${e.theme} / ${e.route || 'Home'}`)}</b><pre>${escape(e.errors.join('\n'))}</pre><a href="${escape(e.capture)}"><img src="${escape(e.capture)}"></a>${e.detailsCapture ? `<a href="${escape(e.detailsCapture)}">Media figure detail</a>` : ''}</article>`).join('')}</section>`;
  await fs.writeFile(path.join(output, 'index.html'), html);
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  for (const entry of failed) console.error(`${entry.locale}/${entry.width}/${entry.theme}/${entry.route}: ${entry.errors.join('; ')}`);
  if (fatal) console.error(fatal);
  if (fatal || failed.length || canaries.length !== 3 || canaries.some(c => !c.detected)) process.exitCode = 1;
  console.log(`UX-001: ${entries.length - failed.length}/${entries.length} passed; report ${path.join(output, 'index.html')}`);
}
