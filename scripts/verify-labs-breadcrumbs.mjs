import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Run against the default all-locale dev host, whose configured remote is local.
const origin = process.env.VERIFY_ORIGIN ?? 'http://127.0.0.1:3000';
const prefix = process.env.VERIFY_BASE_PATH ?? '/';
const browser = await chromium.launch();
const errors = [];
const fixture = legacy => `
export function init() {}
export async function get() {return () => ({contractVersion: 1, mount(container, initial) {
  let options = initial, leaf = true;
  const root = container.attachShadow({mode: 'open'});
  root.innerHTML = '<div data-fixture="ready">Remote test screen</div>';
  function publish() {if (${!legacy}) options.onNavigationChange?.(leaf
    ? [{id:'chat',label:options.locale==='ko'?'대화 데모':'Chat demo'}, {id:'thread',label:options.locale==='ko'?'테스트 대화':'Test conversation'}]
    : [{id:'chat',label:options.locale==='ko'?'대화 데모':'Chat demo'}]);}
  window.__lateNavigation = initial.onNavigationChange;
  window.__fixtureLocale = locale => {options = {...options,locale};publish();};
  publish();
  return {update(next) {options={...options,...next};publish();},
    ${legacy ? '' : "navigate(id) {if (id==='chat') {leaf=false;publish();}},"}
    unmount() {root.replaceChildren();}};
}});}`;
try {
  for (const locale of ['ko', 'en']) {
    const ctx = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', viewport: {width: 390, height: 844}, hasTouch: true});
    await ctx.addCookies([{name: 'jyje_locale', value: locale, url: origin}]);
    await ctx.route('**/__dev_all_events', route => route.abort());
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    const root = origin + prefix + (locale === 'en' ? 'en/' : '');
    const entry = '**/remoteEntry.js*';
    const respond = legacy => route => route.fulfill({contentType: 'text/javascript', headers: {'Access-Control-Allow-Origin': '*'}, body: fixture(legacy)});
    await page.route(entry, respond(false));
    await page.goto(root + 'labs/');
    await page.locator('[data-fixture="ready"]').waitFor();
    const nav = page.locator('.site-breadcrumbs');
    assert.equal(await nav.count(), 1);
    assert.equal(await nav.locator('li').count(), 4);
    const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(n => JSON.parse(n.textContent)).find(data => data['@type'] === 'BreadcrumbList'));
    assert.equal(schema.itemListElement.length, 2, 'Remote IDs must not become fabricated public URLs');
    await nav.getByRole('button', {name: locale === 'ko' ? '대화 데모' : 'Chat demo', exact: true}).tap();
    assert.equal(await nav.locator('li').count(), 3);
    await page.evaluate(() => window.__fixtureLocale('en'));
    assert.equal(await nav.locator('[aria-current="page"]').innerText(), 'Chat demo');
    const bounds = await page.locator('[data-fixture="ready"]').evaluate(node => {
      const host = node.getRootNode().host;
      return {width:host.getBoundingClientRect().width, viewport:document.documentElement.clientWidth,
        available:getComputedStyle(host).getPropertyValue('--labs-min-height')};
    });
    assert.equal(Math.round(bounds.width), bounds.viewport, 'Remote remains full width');
    assert.ok(bounds.available.includes('calc') || bounds.available.includes('max'));
    await nav.locator('a').first().click();
    await page.waitForURL(root);
    await page.evaluate(() => window.__lateNavigation?.([{id:'stale',label:'Stale callback'}]));
    assert.equal(await page.locator('.site-breadcrumbs').count(), 0);
    await page.unroute(entry);
    await page.route(entry, respond(true));
    await page.goto(root + 'labs/');
    await page.locator('[data-fixture="ready"]').waitFor();
    assert.equal(await nav.locator('li').count(), 2, 'Old remote retains Labs root only');
    await page.unroute(entry);
    await page.route(entry, route => route.abort());
    await page.goto(root + 'labs/');
    await page.getByRole('alert').waitFor();
    assert.equal(await nav.locator('li').count(), 2);
    await page.unroute(entry);
    await page.route(entry, respond(false));
    await page.getByRole('button', {name: locale === 'ko' ? '다시 연결' : 'Reconnect'}).click();
    await page.locator('[data-fixture="ready"]').waitFor();
    assert.equal(await nav.locator('li').count(), 4);
    await ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log('Labs breadcrumbs passed: optional v1 navigation, nested ancestor actions, translated callbacks, late callbacks, legacy remote, failure/retry, touch and full-width mount.');
} finally {await browser.close();}
