import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {mergeKoreanFallbackDocs} from './build-wiki-graph.mjs';
import {shouldRebuild} from './source-watch.mjs';
import {withBuildLock} from './build-lock.mjs';
const {buildNetwork} = createRequire(import.meta.url)('../plugins/content-network.cjs');

test('authored locale changes rebuild without generated mirror loops', () => {
  for (const file of ['en/docusaurus-plugin-content-pages/about.mdx', 'ko/docusaurus-theme-classic/navbar.json', 'en/code.json']) assert.ok(shouldRebuild('i18n', file));
  for (const file of ['en/docusaurus-plugin-content-blog/a.md', 'en/docusaurus-plugin-content-docs/current/a.mdx']) assert.equal(shouldRebuild('i18n', file), false);
  assert.equal(shouldRebuild('src', 'generated/resume.ko.json'), false);
  assert.equal(shouldRebuild('content', '.obsidian/workspace.json'), false);
});

test('sync and build tasks serialize and release their shared lock', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lock-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  let active = 0; let max = 0;
  const task = () => withBuildLock(async () => { active++; max = Math.max(max, active); await new Promise(r => setTimeout(r, 30)); active--; }, root);
  await Promise.all([task(), task()]);
  assert.equal(max, 1);
  assert.equal(fs.existsSync(path.join(root, '.profile2-build.lock')), false);
});

function fixture(t, locale = 'ko', base = '/') {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-network-'));
  t.after(() => fs.rmSync(siteDir, {recursive: true, force: true}));
  const write = (file, body) => { const p = path.join(siteDir, file); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, body); };
  write('data/tags.yml', 'tags:\n  ai:\n    label: {ko: AI, en: AI}\n');
  const metadata = (source, permalink, extra = {}) => ({source: `@site/${source}`, permalink, title: 'Same title', tags: [{permalink: `${base}tags/ai`}], ...extra});
  const context = {siteDir, siteConfig: {baseUrl: base, url: 'https://example.com'}, i18n: {currentLocale: locale}};
  const content = (docs, posts) => ({'docusaurus-plugin-content-docs': {default: {loadedVersions: [{docs}]}}, 'docusaurus-plugin-content-blog': {default: {blogPosts: posts.map(metadata => ({metadata}))}}});
  return {write, metadata, context, content};
}

test('official permalinks join MDX, reference links, tags, backlinks and duplicate titles', async t => {
  const f = fixture(t);
  f.write('content/ko/wiki/a.mdx', '[Post][p]\n\n[p]: ../blog/post.md#results\n\n```md\n[ignored](missing.md)\n```\n[again](../blog/post.md)');
  f.write('content/ko/blog/post.md', '[Wiki](/wiki/custom?x=1#heading)\n[external](https://elsewhere.test/wiki/custom)');
  const result = await buildNetwork(f.context, f.content([f.metadata('content/ko/wiki/a.mdx', '/wiki/custom')], [f.metadata('content/ko/blog/post.md', '/blog/actual')]));
  assert.equal(result.nodes.length, 3);
  assert.equal(result.edges.filter(e => e.kind === 'link').length, 2);
  assert.equal(result.edges.filter(e => e.kind === 'tag').length, 2);
  assert.deepEqual(result.unresolved, []);
  assert.ok(result.nodes.every(node => !('source' in node) && !('authored' in node)));
});

test('project base, English fallback, unlisted and draft exclusions', async t => {
  const f = fixture(t, 'en', '/profile-2/en/');
  f.write('i18n/en/docusaurus-plugin-content-docs/current/a.md', '[post](/blog/post)');
  f.write('content/en/blog/post.md', '[wiki](/profile-2/en/wiki/a)');
  const docs = [f.metadata('i18n/en/docusaurus-plugin-content-docs/current/a.md', '/profile-2/en/wiki/a')];
  const posts = [f.metadata('content/en/blog/post.md', '/profile-2/en/blog/post'), f.metadata('missing.md', '/hidden', {unlisted: true}), f.metadata('missing.md', '/draft', {frontMatter: {draft: true}})];
  const result = await buildNetwork(f.context, f.content(docs, posts));
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].koreanFallback, false);
  assert.equal(result.entries.find(n => n.kind === 'wiki').koreanPath, '/profile-2/wiki/a');
  assert.equal(result.edges.filter(e => e.kind === 'link').length, 2);
  assert.equal(result.nodes.find(n => n.isTag).path, '/profile-2/en/tags/ai');
});

test('duplicate routes and unregistered tags fail instead of silently merging', async t => {
  const f = fixture(t);
  const m = f.metadata('a.md', '/same');
  await assert.rejects(buildNetwork(f.context, f.content([m, m], [])), /Duplicate content route/);
  await assert.rejects(buildNetwork(f.context, f.content([{...m, tags: ['unknown']}], [])), /Unregistered/);
});

test('fallback supports MDX, preserves front matter and authored translations', t => {
  const f = fixture(t);
  f.write('ko/page.mdx', '---\ntitle: Test\n---\nimport A from "./a";\n\n# 한국어');
  f.write('ko/translated.md', '# 한국어'); f.write('en/translated.md', '# English');
  f.write('ko/switched.mdx', '# 한국어'); f.write('en/switched.md', '# English extension switch');
  const ko = path.join(f.context.siteDir, 'ko'); const en = path.join(f.context.siteDir, 'en');
  mergeKoreanFallbackDocs(ko, en);
  const result = fs.readFileSync(path.join(en, 'page.mdx'), 'utf8');
  assert.ok(result.startsWith('---\ntitle: Test\n---'));
  assert.match(result, /English version unavailable/);
  assert.match(result, /import A/);
  assert.equal(fs.readFileSync(path.join(en, 'translated.md'), 'utf8'), '# English');
  assert.equal(fs.existsSync(path.join(en, 'switched.mdx')), false);
  mergeKoreanFallbackDocs(ko, en);
  assert.equal(fs.readFileSync(path.join(en, 'page.mdx'), 'utf8'), result);
});
