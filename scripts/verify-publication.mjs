import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {contentMode, ignorePatterns, isDocIgnored} from '../plugins/content-visibility.cjs';

const root = path.resolve(import.meta.dirname, '..');
const output = path.resolve(process.env.VERIFY_BUILD_DIR ?? 'build');
const mode = contentMode();
const patterns = ignorePatterns();
const prefix = process.env.VERIFY_BASE_PATH ?? '/profile-2/';
const files = fs.readdirSync(output, {recursive: true}).filter(file => fs.statSync(path.join(output, file)).isFile());
const documents = files.filter(file => file.endsWith('.html') && file !== '404.html' && file !== 'en/404.html');
assert.ok(documents.length > 0, 'No HTML documents were built');
for (const file of documents) assert.ok(file === 'index.html' || file.endsWith('/index.html'), `Flat HTML output could reproduce the Pages slash bug: ${file}`);

// Deliberately do not use serve-handler cleanUrls or an SPA fallback. This
// models a directory-index host and proves success without executing JavaScript.
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { response.writeHead(400).end(); return; }
  if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
  const file = path.resolve(output, pathname.slice(prefix.length));
  if (file !== output && !file.startsWith(output + path.sep)) { response.writeHead(404).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { response.writeHead(301, {location: url.pathname + '/' + url.search}).end(); return; }
    const index = path.join(file, 'index.html');
    if (fs.existsSync(index)) { response.writeHead(200, {'content-type': 'text/html'}).end(fs.readFileSync(index)); return; }
  }
  response.writeHead(404).end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const file of documents) {
    const relative = file.replace(/index\.html$/, '');
    const route = origin + prefix + relative;
    for (const url of [route, route.endsWith('/') ? route.slice(0, -1) : route]) {
      if (url === origin + prefix.slice(0, -1)) continue;
      const response = await fetch(url);
      assert.equal(response.status, 200, url);
    }
  }
  for (const locale of ['ko', 'en']) {
    const routeRoot = origin + prefix + (locale === 'en' ? 'en/' : '');
    for (const route of ['wiki', 'blog', 'about', 'about/resume', 'about/cv', 'tags/kubernetes', 'wiki/graph']) {
      const response = await fetch(routeRoot + route + '?publication-test=1', {redirect: 'manual'});
      assert.equal(response.status, 301, `${locale}/${route}: directory redirect`);
      assert.ok(response.headers.get('location').endsWith('/?publication-test=1'));
      assert.equal((await fetch(routeRoot + route + '/')).status, 200);
    }
    assert.equal((await fetch(routeRoot + 'unknown-publication-route/')).status, 404);
    for (const kind of ['wiki', 'blog']) {
      const source = path.join(root, 'content', locale, kind);
      for (const entry of fs.readdirSync(source, {withFileTypes: true})) {
        if (!entry.isDirectory() || !entry.name.startsWith('_') || !isDocIgnored(`content/${locale}/${kind}/${entry.name}/`, patterns)) continue;
        const section = entry.name.slice(1);
        const relative = `${locale === 'en' ? 'en/' : ''}${kind}/${section}/`;
        if (mode === 'development') {
          assert.ok(files.some(file => file.startsWith(relative)), `Missing development section ${relative}`);
        } else {
          assert.ok(!files.some(file => file.startsWith(relative)), `Published development section ${relative}`);
          assert.equal((await fetch(routeRoot + `${kind}/${section}/`)).status, 404);
          const needle = `/${kind}/${section}`;
          for (const file of files.filter(file => /\.(html|js|json|xml|map)$/.test(file))) {
            const text = fs.readFileSync(path.join(output, file), 'utf8').replaceAll('\\/', '/');
            assert.ok(!text.includes(needle), `Development route leaked into ${file}: ${needle}`);
          }
        }
      }
    }
  }
  console.log(`${mode}: ${documents.length} HTML routes verified with and without slashes; publication boundaries passed.`);
} finally { await new Promise(resolve => server.close(resolve)); }
