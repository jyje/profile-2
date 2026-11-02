import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import test from 'node:test';
import http from 'node:http';
import {patchBraces} from './patch-braces.cjs';
import {patchDeepmerge} from './patch-deepmerge.cjs';
import {patchMinimatch} from './patch-minimatch.cjs';

const require = createRequire(import.meta.url);
const braces = require('braces');
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));

test('legacy minimatch bounds expansion and globparts while retaining ordinary matching', () => {
  assert.ok(patchMinimatch(undefined, {check: true}) > 0);
  patchMinimatch(); patchMinimatch(undefined, {check: true});
  const match = require('minimatch');
  for (const pattern of ['x'.repeat(8193), Array(130).fill('x').join('/'), '{1..300}', Array(17).fill('**').join('/')]) {
    assert.throws(() => match('x', pattern));
  }
  const amplified = Array(100).fill('x').join('/') + '/{1..100}';
  assert.throws(() => new match.Minimatch(amplified), /part budget/);
  assert.equal(match('/wiki/d/note.html', '/wiki/**/*.html'), true);
  assert.equal(match('/wiki/.private', '/wiki/*'), false);
  assert.equal(match('/img/logo.svg', '/img/*.{svg,png}'), true);
  assert.deepEqual(match.braceExpand('x{1..3}'), ['x1', 'x2', 'x3']);
  assert.ok(match.makeRe('*.html').test('index.html'));
});

test('legacy minimatch integrity and installation checks fail closed', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'matcher-integrity-'));
  try {
    const directory = path.join(root, 'node_modules/minimatch');
    mkdirSync(directory, {recursive: true});
    const metadata = version => writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({packages: {'node_modules/minimatch': {version}}}));
    metadata('3.1.5');
    const patched = readFileSync(require.resolve('minimatch'), 'utf8');
    const file = path.join(directory, 'minimatch.js');
    writeFileSync(file, patched);
    patchMinimatch(root, {check: true});
    writeFileSync(file, patched + '\n// synthetic unexpected modification\n');
    assert.throws(() => patchMinimatch(root), /Unexpected minimatch source/);
    const start = patched.indexOf('  // profile-2: bound globparts');
    const end = patched.indexOf('  set = this.globParts', start);
    writeFileSync(file, patched.slice(0, start) + patched.slice(end));
    assert.throws(() => patchMinimatch(root, {check: true}), /Missing minimatch mitigation/);
    patchMinimatch(root);
    metadata('3.1.6');
    assert.throws(() => patchMinimatch(root), /Review minimatch mitigation/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('bounded matcher retains actual localized static serving and clean URLs', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'serving-contract-'));
  for (const route of ['wiki', 'en/wiki']) {
    mkdirSync(path.join(root, route), {recursive: true});
    writeFileSync(path.join(root, route, 'index.html'), `<h1>${route}</h1>`);
  }
  const handler = require('serve-handler');
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith('/profile-2/')) { res.writeHead(404); res.end(); return; }
    req.url = '/' + req.url.slice('/profile-2/'.length);
    handler(req, res, {public: root, cleanUrls: true, directoryListing: false})
      .catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}/profile-2/`;
    for (const route of ['wiki', 'wiki/', 'en/wiki', 'en/wiki/']) {
      const response = await fetch(origin + route + '?q=test');
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<h1>/);
    }
    const missing = await fetch(origin + 'wiki/guide/private-note');
    assert.equal(missing.status, 404);
    await missing.arrayBuffer();
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(root, {recursive: true, force: true}); }
});

test('deepmerge own-key mitigation is integrity checked, idempotent and preserves ordinary options', () => {
  assert.ok(patchDeepmerge(undefined, {check: true}) > 0);
  patchDeepmerge();
  patchDeepmerge(undefined, {check: true});
  const merge = require('deepmerge');
  const target = Object.create(null);
  Object.defineProperty(target, '__proto__', {value: {syntheticFlag: true}, enumerable: true});
  for (const result of [merge(target, {}), merge(Object.create(null), target)]) {
    assert.equal(Object.getPrototypeOf(result), Object.prototype);
    assert.equal(result.syntheticFlag, undefined);
    assert.equal(Object.hasOwn(result, '__proto__'), true);
  }
  assert.equal({}.syntheticFlag, undefined);
  const symbol = Symbol('option');
  assert.deepEqual(merge({a: {x: 1}, list: [1]}, {a: {y: 2}, list: [2]}), {a: {x: 1, y: 2}, list: [1, 2]});
  assert.equal(merge({[symbol]: 1}, {})[symbol], 1);
  assert.deepEqual(merge({items: [1]}, {items: [2]}, {arrayMerge: (_target, source) => source}), {items: [2]});
  assert.deepEqual(merge({x: {a: 1}}, {x: {b: 2}}, {
    customMerge: key => key === 'x' ? () => ({custom: true}) : undefined,
  }), {x: {custom: true}});
});

test('SVG optimization still produces valid SVG with viewBox and shape content', () => {
  const svgo = require('@svgr/plugin-svgo');
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
  const output = svgo(source, {svgo: true, icon: true, runtimeConfig: false}, {filePath: 'synthetic.svg'});
  assert.match(output, /<svg/);
  assert.match(output, /viewBox="0 0 24 24"/);
  assert.match(output, /<(?:path|rect)/);
});

test('deepmerge mitigation rejects missing patches, tampered sources and unknown versions', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'merge-integrity-'));
  try {
    const directory = path.join(root, 'node_modules/deepmerge');
    mkdirSync(path.join(directory, 'dist'), {recursive: true});
    const metadata = version => writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({packages: {'node_modules/deepmerge': {version}}}));
    metadata('4.3.1');
    const originalRoot = path.dirname(require.resolve('deepmerge/package.json'));
    for (const file of ['index.js', 'dist/cjs.js', 'dist/umd.js']) {
      writeFileSync(path.join(directory, file), readFileSync(path.join(originalRoot, file)));
    }
    patchDeepmerge(root, {check: true});
    const file = path.join(directory, 'index.js');
    const patched = readFileSync(file, 'utf8');
    writeFileSync(file, patched + '\n// synthetic unexpected modification\n');
    assert.throws(() => patchDeepmerge(root), /Unexpected deepmerge source/);
    writeFileSync(file, patched.replace('// profile-2: define own merge keys (GHSA-gcqx-w48m-w2h4)\n', '').replace(/Object\.defineProperty\(destination, key, \{value: (.*), enumerable: true, configurable: true, writable: true\}\)/g, 'destination[key] = $1'));
    assert.throws(() => patchDeepmerge(root, {check: true}), /Missing deepmerge mitigation/);
    patchDeepmerge(root);
    metadata('4.3.2');
    assert.throws(() => patchDeepmerge(root), /Review deepmerge mitigation/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('reviewed security versions cover every locked and installed toolchain copy', () => {
  const approved = {'body-parser': '1.20.9', qs: '6.16.2', joi: '17.13.9', undici: '7.30.1', 'serialize-javascript': '7.1.3'};
  for (const [name, version] of Object.entries(approved)) {
    const entries = Object.entries(lock.packages).filter(([key]) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`));
    assert.ok(entries.length, `${name} must be present`);
    for (const [key, item] of entries) {
      assert.equal(item.version, version, `${name}: review changes to the security baseline`);
      const installed = JSON.parse(readFileSync(new URL(`../${key}/package.json`, import.meta.url)));
      assert.equal(installed.version, item.version, `${name}: run npm ci to match the lockfile`);
    }
  }
});

test('serialization keeps script-sensitive data escaped and callable build functions intact', () => {
  const serialize = require('serialize-javascript');
  const data = {text: '</script>\u2028\u2029', values: [1, true, null]};
  const encoded = serialize(data, {isJSON: true});
  assert.doesNotMatch(encoded, /<\/script/i);
  assert.deepEqual(JSON.parse(encoded), data);
  const source = serialize({transform: function(value) { return value + 1; }});
  assert.equal(Function(`return (${source})`)().transform(2), 3);
});

test('Joi retains ordinary config and multiple-email validation behavior', () => {
  const Joi = require('joi');
  assert.equal(Joi.object({enabled: Joi.boolean().required()}).validate({enabled: true}).error, undefined);
  const schema = Joi.string().email({multiple: true, tlds: false});
  assert.equal(schema.validate('a@example.com,b@example.com').error, undefined);
  assert.ok(schema.validate(','.repeat(1000)).error);
});

test('patched Undici retains Agent, redirect and response consumption contracts', async () => {
  const {Agent, fetch} = require('undici');
  const agent = new Agent({connect: {family: 4}});
  const server = http.createServer((req, res) => {
    if (req.url === '/redirect') { res.writeHead(302, {Location: '/result'}); res.end(); }
    else { res.writeHead(200, {'Content-Type': 'application/json'}); res.end('{"ok":true}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/redirect`, {dispatcher: agent});
    assert.equal(response.status, 200);
    assert.equal(response.redirected, true);
    assert.deepEqual(await response.json(), {ok: true});
  } finally { await agent.close(); await new Promise(resolve => server.close(resolve)); }
});

test('install, build, development and CI cannot silently omit the mitigation', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(manifest.scripts.postinstall, 'node scripts/patch-dependencies.cjs');
  for (const file of ['build-site.mjs', 'development-command.mjs', 'dev-all.mjs', 'sync-locked.mjs']) {
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), /patchDependencies\(undefined, \{check: true\}\)/);
  }
  for (const file of ['ci.yaml', 'publish-github-pages.yaml']) {
    assert.match(readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8'), /npm run test:security/);
  }
});

test('every locked worker pool and selector parser has the security pin', () => {
  for (const [name, version] of [['tinypool', '2.1.2'], ['postcss-selector-parser', '7.1.6']]) {
    const entries = Object.entries(lock.packages).filter(([key]) => key.endsWith(`/node_modules/${name}`) || key === `node_modules/${name}`);
    assert.ok(entries.length, `${name} must be present`);
    for (const [, item] of entries) assert.equal(item.version, version);
  }
});

test('braces mitigation is installed, integrity checked, and idempotent', () => {
  assert.ok(patchBraces(undefined, {check: true}) > 0);
  patchBraces();
  patchBraces(undefined, {check: true});
});

test('missing, tampered and unknown braces sources fail closed', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'braces-integrity-'));
  try {
    mkdirSync(path.join(root, 'node_modules/braces/lib'), {recursive: true});
    const fixtureLock = version => writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({packages: {'node_modules/braces': {version}}}));
    fixtureLock('3.0.3');
    const patched = readFileSync(require.resolve('braces/lib/parse'), 'utf8');
    const unpatched = patched.replaceAll(/      \/\/ profile-2: bounded braces recursion \(GHSA-vfj7-8cjw-p6xm\)\n      if \(stack.length >= 100\) throw new SyntaxError\('Brace nesting exceeds maximum depth \(100\)'\);\n/g, '');
    const file = path.join(root, 'node_modules/braces/lib/parse.js');
    writeFileSync(file, unpatched);
    assert.throws(() => patchBraces(root, {check: true}), /Missing braces/);
    writeFileSync(file, patched + '\n// unexpected change\n');
    assert.throws(() => patchBraces(root), /Unexpected braces source/);
    fixtureLock('3.0.4');
    assert.throws(() => patchBraces(root), /Review braces mitigation/);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('braces rejects deep strings and direct ASTs before recursive walkers', () => {
  const pattern = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
  for (const fn of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => fn(pattern), error => error instanceof SyntaxError && /maximum depth/.test(error.message));
  }
  const parentheses = '('.repeat(4000) + 'x' + ')'.repeat(4000);
  assert.throws(() => braces.parse(parentheses), /maximum depth/);
  let ast = {type: 'text', value: 'x'};
  for (let i = 0; i < 200; i++) ast = {type: 'root', nodes: [ast]};
  for (const fn of [braces.compile, braces.expand, braces.stringify]) assert.throws(() => fn(ast), /maximum depth/);
  const cycle = {type: 'root', nodes: []}; cycle.nodes.push(cycle);
  assert.throws(() => braces.stringify(cycle), /cycle/);
});

test('normal glob, range, escaped, quoted and nested syntax stays compatible', () => {
  assert.deepEqual(braces.expand('content/{ko,en}/wiki/{d,_guide}/*.md'), [
    'content/ko/wiki/d/*.md', 'content/ko/wiki/_guide/*.md', 'content/en/wiki/d/*.md', 'content/en/wiki/_guide/*.md',
  ]);
  assert.deepEqual(braces.expand('x{1..3}'), ['x1', 'x2', 'x3']);
  assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
  assert.deepEqual(braces.expand('\\{literal\\}'), ['{literal}']);
  assert.deepEqual(braces.expand('"{a,b}"'), ['{a,b}']);
  assert.equal(require('micromatch').isMatch('content/ko/wiki/d/test.md', 'content/{ko,en}/wiki/**/*.md'), true);
});

test('patched selector parser handles long flat selectors without losing classes', () => {
  const parse = require('postcss-selector-parser');
  assert.equal(parse().astSync('.a'.repeat(20000)).first.nodes.length, 20000);
});

test('Tinypool 2 retains the Docusaurus worker_threads contract', async () => {
  const {default: Tinypool} = await import('tinypool');
  const pool = new Tinypool({filename: new URL('./fixtures/security-worker.mjs', import.meta.url).pathname,
    minThreads: 1, maxThreads: 2, runtime: 'worker_threads', isolateWorkers: false,
    concurrentTasksPerWorker: 1, workerData: {fixture: true}, resourceLimits: {}});
  try { assert.deepEqual(await Promise.all([pool.run('ko'), pool.run('en')]), ['ko', 'en']); }
  finally { await pool.destroy(); }
});

test('Tinypool ignores inherited constructor and run options', () => {
  const source = `
    const {default: Tinypool} = await import('tinypool');
    Object.prototype.execArgv = ['--profile-2-invalid-node-option'];
    const pool = new Tinypool({filename: ${JSON.stringify(new URL('./fixtures/security-worker.mjs', import.meta.url).pathname)}, minThreads: 1, maxThreads: 1});
    Object.prototype.filename = '/nonexistent/profile-2-inherited-worker.mjs';
    try { if (await pool.run('safe', {}) !== 'safe') throw new Error('Worker contract changed'); }
    finally { delete Object.prototype.filename; delete Object.prototype.execArgv; await pool.destroy(); }
  `;
  execFileSync(process.execPath, ['-e', `(async () => {${source}})().catch(error => {console.error(error); process.exitCode = 1;});`], {cwd: new URL('..', import.meta.url), timeout: 15000});
});
