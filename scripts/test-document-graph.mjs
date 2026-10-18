import assert from 'node:assert/strict';
import {test} from 'node:test';
import {neighborhood, isWikiHome} from '../src/components/document-graph/neighborhood.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {titleEmoji, validateWikiTitles} from './validate-wiki-titles.mjs';
import {withDevelopmentNotice} from './development-notice.mjs';
import {prepareContent} from './prepare-content.mjs';
import {syncWikiNavigation} from './sync-wiki-navigation.mjs';

test('only the exact localized wiki home receives the global graph', () => {
  for (const base of ['/', '/profile-2/', '/profile-2/en/']) {
    assert.equal(isWikiHome({kind: 'wiki', path: `${base}wiki/`}, `${base}wiki/`), true);
    assert.equal(isWikiHome({kind: 'wiki', path: `${base}wiki`}, `${base}wiki/`), true);
    assert.equal(isWikiHome({kind: 'wiki', path: `${base}wiki/d/wiki/`}, `${base}wiki/`), false);
    assert.equal(isWikiHome({kind: 'blog', path: `${base}blog/wiki/`}, `${base}wiki/`), false);
  }
});

test('localized category labels use standard Docusaurus translations without stale private categories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-navigation-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const locale of ['ko', 'en']) {
    const dir = path.join(root, `.content-build/${locale}/wiki/d`);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, '_category_.json'), JSON.stringify({label: locale === 'ko' ? '📚 문서' : '📚 Documents'}));
  }
  syncWikiNavigation(root);
  const output = path.join(root, 'i18n/en/docusaurus-plugin-content-docs/current.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(output)), {'sidebar.wikiSidebar.category.📚 문서': {message: '📚 Documents'}});
  fs.unlinkSync(path.join(root, '.content-build/ko/wiki/d/_category_.json'));
  syncWikiNavigation(root);
  assert.deepEqual(JSON.parse(fs.readFileSync(output)), {});
});

test('development notice is idempotent and precedes translated fallback notices', t => {
  const source = '---\ntitle: 📄 Note\nlast_update:\n  date: 2020-01-01\n---\n# Note\n\nBody\n';
  const ko = withDevelopmentNotice(source, 'ko');
  assert.equal(withDevelopmentNotice(ko, 'ko'), ko);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-notice-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, '.docignore'), 'content/*/wiki/_guide/\n');
  for (const locale of ['ko', 'en']) fs.mkdirSync(path.join(root, `content/${locale}/wiki/_guide`), {recursive: true});
  fs.writeFileSync(path.join(root, 'content/ko/wiki/_guide/note.md'), source);
  fs.writeFileSync(path.join(root, 'content/en/wiki/_guide/note.md'), '---\ntitle: 📄 Note\n---\n');
  prepareContent(root, 'development');
  const english = fs.readFileSync(path.join(root, '.content-build/en/wiki/guide/note.md'), 'utf8');
  assert.ok(english.indexOf('Development-only document') < english.indexOf('English version unavailable'));
  assert.ok(!english.includes('개발 전용 문서'));
  assert.equal(english.match(/\.docignore/g).length, 1);
  assert.match(english, /date: '?2020-01-01/);
  assert.ok(english.endsWith('\nBody\n'));
});

test('wiki title policy includes excluded documents and translation parity', t => {
  assert.equal(titleEmoji('🛠️ Design', 'test'), '🛠️');
  for (const title of ['Title', '🧠 Home', '📄 📚 Title']) assert.throws(() => titleEmoji(title, 'test'), /emoji/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-titles-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const locale of ['ko', 'en']) fs.mkdirSync(path.join(root, `content/${locale}/wiki/_guide`), {recursive: true});
  const ko = path.join(root, 'content/ko/wiki/_guide/test.md');
  const en = path.join(root, 'content/en/wiki/_guide/test.mdx');
  fs.writeFileSync(ko, '---\ntitle: Missing emoji\n---\n');
  assert.throws(() => validateWikiTitles(root), /emoji/);
  fs.writeFileSync(ko, '---\ntitle: 📄 Guide\n---\n');
  fs.writeFileSync(en, '---\ntitle: 🧭 Guide\n---\n');
  assert.throws(() => validateWikiTitles(root), /differs/);
  fs.writeFileSync(en, '---\ntitle: 📄 Guide\n---\n');
  assert.doesNotThrow(() => validateWikiTitles(root));
});

test('local graphs include direct links, backlinks and own tags, not tag siblings', () => {
  const graph = {nodes: ['current', 'out', 'in', 'tag', 'sibling', 'isolated'].map(id => ({id})), edges: [
    {source: 'current', target: 'out', kind: 'link'},
    {source: 'out', target: 'current', kind: 'link'},
    {source: 'in', target: 'current', kind: 'link'},
    {source: 'current', target: 'tag', kind: 'tag'},
    {source: 'sibling', target: 'tag', kind: 'tag'},
  ]};
  const local = neighborhood(graph, 'current');
  assert.deepEqual(local.nodes.map(node => node.id), ['current', 'out', 'in', 'tag']);
  assert.equal(local.edges.length, 3);
  assert.deepEqual(neighborhood(graph, 'isolated'), {nodes: [{id: 'isolated'}], edges: []});
  assert.deepEqual(neighborhood(graph, 'missing'), {nodes: [], edges: []});
});
