import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import test from 'node:test';
import {patchBraces} from './patch-braces.cjs';

const require = createRequire(import.meta.url);
const braces = require('braces');
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));

test('install, build, development and CI cannot silently omit the mitigation', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(manifest.scripts.postinstall, 'node scripts/patch-braces.cjs');
  for (const file of ['build-site.mjs', 'development-command.mjs', 'dev-all.mjs', 'sync-locked.mjs']) {
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), /patchBraces\(undefined, \{check: true\}\)/);
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
