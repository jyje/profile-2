const assert = require('node:assert/strict');
const {test} = require('node:test');
const {runLocalePreference} = require('../plugins/locale-preference.cjs');

const settings = {
  defaultLocale: 'ko',
  localeBaseUrls: {ko: '/', en: '/en/'},
  cookiePath: '/',
};

function harness({
  path = '/about',
  search = '',
  hash = '',
  cookie = '',
  languages = ['en-US'],
  userAgent = 'Mozilla/5.0',
  referrer = '',
  targetExists = true,
} = {}) {
  const redirects = [];
  const probes = [];
  const cookieWrites = [];
  const listeners = {};
  const origin = 'https://jyje.online';
  const env = {
    window: {
      location: {
        origin,
        protocol: 'https:',
        pathname: path,
        search,
        hash,
        replace: (url) => redirects.push(url),
      },
    },
    document: {
      referrer,
      get cookie() { return cookie; },
      set cookie(value) { cookieWrites.push(value); },
      addEventListener: (name, listener) => { listeners[name] = listener; },
    },
    navigator: {languages, language: languages[0], userAgent, webdriver: false},
    fetch: (url, options) => {
      probes.push({url, options});
      return Promise.resolve({ok: targetExists});
    },
  };
  return {env, redirects, probes, cookieWrites, listeners};
}

async function apply(input, config = settings) {
  const state = harness(input);
  runLocalePreference(config, state.env);
  await Promise.resolve();
  return state;
}

test('browser language selects the matching page and keeps query and fragment', async () => {
  const result = await apply({search: '?from=home', hash: '#work'});
  assert.equal(result.probes[0].url, '/en/about');
  assert.equal(result.probes[0].options.method, 'HEAD');
  assert.deepEqual(result.redirects, ['/en/about?from=home#work']);
  assert.deepEqual(result.cookieWrites, []);
});

test('an explicit cookie takes precedence over browser language', async () => {
  const result = await apply({path: '/en/blog', cookie: 'jyje_locale=ko'});
  assert.deepEqual(result.redirects, ['/blog']);
});

test('same-site language links keep their requested URL', async () => {
  const result = await apply({
    path: '/wiki/knowledge/example',
    referrer: 'https://jyje.online/en/wiki/knowledge/example',
  });
  assert.deepEqual(result.probes, []);
  assert.deepEqual(result.redirects, []);
});

test('crawler requests and missing localized pages are not rerouted', async () => {
  const crawler = await apply({userAgent: 'Googlebot/2.1'});
  const missing = await apply({targetExists: false});
  assert.deepEqual(crawler.probes, []);
  assert.deepEqual(crawler.redirects, []);
  assert.deepEqual(missing.redirects, []);
});

test('locale menu selection writes a scoped cookie', async () => {
  const result = await apply({languages: ['ko-KR']});
  const link = {
    closest: () => ({}),
    getAttribute: () => 'en-US',
  };
  result.listeners.click({target: {closest: () => link}});
  assert.match(result.cookieWrites[0], /^jyje_locale=en; Max-Age=31536000; Path=\/; SameSite=Lax; Secure$/);
});

test('project Pages base URL is retained', async () => {
  const result = await apply(
    {path: '/profile-2/about'},
    {
      defaultLocale: 'ko',
      localeBaseUrls: {ko: '/profile-2/', en: '/profile-2/en/'},
      cookiePath: '/profile-2/',
    },
  );
  assert.deepEqual(result.redirects, ['/profile-2/en/about']);
});
