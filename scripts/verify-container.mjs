import assert from 'node:assert/strict';
const origin = process.env.CONTAINER_ORIGIN ?? 'http://127.0.0.1:3038';
const mode = process.env.SITE_CONTENT_MODE ?? 'development';
assert.ok(['development', 'public'].includes(mode));
let count = 0;
for (const prefix of ['/', '/en/']) {
  for (const route of ['', 'blog/', 'wiki/', 'wiki/d/raspberry-pi/', 'about/', 'about/portfolio/', 'about/resume/', 'tags/kubernetes/', 'search/?q=kubernetes', 'labs/']) {
    const response = await fetch(origin + prefix + route);
    assert.equal(response.status, 200, `Expected document response: ${prefix}${route}`);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await response.arrayBuffer(); count++;
  }
  const guide = await fetch(origin + prefix + 'wiki/guide/wiki-reference-template/');
  assert.equal(guide.status, mode === 'development' ? 200 : 404);
  await guide.arrayBuffer();
}
for (const route of ['/.git/config', '/hidden/private.md', '/package.json', '/wiki/does-not-exist/']) {
  const response = await fetch(origin + route);
  assert.equal(response.status, 404); await response.arrayBuffer();
}
assert.equal((await fetch(origin + '/healthz')).status, 200);
const revision = await (await fetch(origin + '/_revision.json')).json();
assert.match(revision.revision, /^[0-9a-f]{40}$/);
if (process.env.EXPECTED_REVISION) assert.equal(revision.revision, process.env.EXPECTED_REVISION);
if (process.env.REQUIRE_CLEAN_REVISION === 'true') assert.equal(revision.dirty, false);
console.log(`Container verified: ${count} localized routes, content mode, missing/private paths, health, cache policy and revision metadata.`);
