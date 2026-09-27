import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {prepareContent} from './prepare-content.mjs';
import {contentMode, ignorePatterns, isDocIgnored, authorFile, assertPreparedContent} from '../plugins/content-visibility.cjs';
import {shouldRebuild, authoredWatchPaths} from './source-watch.mjs';
import {blogPublicationRoute} from './publication-blog-routes.mjs';

test('excluded blog audits use explicit or native date-based permalinks, not source directories', () => {
  assert.equal(blogPublicationRoute('---\nslug: private-demo\n---\nBody', 'internal/2026-01-01-note.md', '/profile-2/en/'), '/profile-2/en/blog/private-demo');
  assert.equal(blogPublicationRoute('# Note', 'internal/2026-01-01-note.md', '/'), '/blog/2026/01/01/internal/note');
  assert.equal(blogPublicationRoute('---\ndraft: true\n---\nBody', 'internal/note.md', '/'), undefined);
});

test('polling enumerates editable data files as well as content, excluding hidden files', t => {
  const f = fixture(t);
  f.write('data/resume.ko.yml', 'basics: {}');
  f.write('data/tags.yml', 'tags: {}');
  f.write('data/.hidden.yml', 'hidden: true');
  const paths = authoredWatchPaths(f.root);
  for (const file of ['data/resume.ko.yml', 'data/tags.yml', 'content/en/wiki/_guide/authoring.mdx']) assert.ok(paths.has(path.join(f.root, file)));
  assert.equal(paths.has(path.join(f.root, 'data/.hidden.yml')), false);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-publication-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), value); };
  write('.docignore', '# Both locales\ncontent/*/wiki/_guide/\ncontent/*/wiki/_design/\ncontent/*/blog/_internal/\ncontent/*/wiki/private.md\n');
  for (const locale of ['ko', 'en']) {
    write(`content/${locale}/wiki/index.md`, 'public');
    write(`content/${locale}/wiki/_guide/authoring.mdx`, 'development only');
    write(`content/${locale}/wiki/_guide/assets/example.txt`, 'development asset');
    write(`content/${locale}/wiki/_design/index.md`, 'design');
    write(`content/${locale}/wiki/private.md`, 'private');
    write(`content/${locale}/blog/_internal/test.md`, 'internal blog');
  }
  return {root, write, staged: file => path.join(root, '.content-build', file)};
}

test('publication defaults to public and invalid modes fail closed', () => {
  assert.equal(contentMode({}), 'public');
  assert.equal(contentMode({SITE_CONTENT_MODE: 'development'}), 'development');
  assert.throws(() => contentMode({SITE_CONTENT_MODE: 'prodution'}), /Invalid/);
  assert.equal(shouldRebuild('root', '.docignore'), true);
  assert.equal(shouldRebuild('content', 'en/wiki/_guide/authoring.mdx'), true);
  assert.equal(shouldRebuild('content', '.obsidian/workspace.json'), false);
});

test('docignore globs apply to both locales, preserve public files and reject unsafe rules', t => {
  const f = fixture(t); const patterns = ignorePatterns(f.root);
  for (const locale of ['ko', 'en']) {
    assert.equal(isDocIgnored(`content/${locale}/wiki/_guide/`, patterns), true);
    assert.equal(isDocIgnored(`content/${locale}/wiki/_guide/assets/example.txt`, patterns), true);
    assert.equal(isDocIgnored(`content/${locale}/wiki/knowledge/guide.md`, patterns), false);
    assert.equal(authorFile(`content/${locale}/wiki/guide/authoring.mdx`, f.root), `content/${locale}/wiki/_guide/authoring.mdx`);
  }
  f.write('.docignore', '!content/ko/wiki/index.md');
  assert.throws(() => ignorePatterns(f.root), /Invalid/);
  f.write('.docignore', 'content/../src/');
  assert.throws(() => ignorePatterns(f.root), /Invalid/);
  fs.unlinkSync(path.join(f.root, '.docignore'));
  assert.throws(() => prepareContent(f.root), /ENOENT/);
});

test('development stages aliases and assets; subsequent public build removes them without changing authorship', t => {
  const f = fixture(t);
  prepareContent(f.root, 'development');
  for (const locale of ['ko', 'en']) {
    const page = fs.readFileSync(f.staged(`${locale}/wiki/guide/authoring.mdx`), 'utf8');
    assert.match(page, /\[!warning\]/);
    assert.match(page, /\.docignore/);
    assert.ok(page.endsWith('development only'));
    assert.ok(fs.existsSync(f.staged(`${locale}/wiki/guide/assets/example.txt`)));
    assert.ok(fs.existsSync(f.staged(`${locale}/blog/internal/test.md`)));
  }
  prepareContent(f.root, 'public');
  for (const locale of ['ko', 'en']) {
    assert.ok(fs.existsSync(f.staged(`${locale}/wiki/index.md`)));
    for (const relative of ['wiki/guide', 'wiki/design', 'wiki/_guide', 'wiki/private.md', 'blog/internal']) {
      assert.equal(fs.existsSync(f.staged(`${locale}/${relative}`)), false, relative);
    }
    assert.ok(fs.existsSync(path.join(f.root, `content/${locale}/wiki/_guide/authoring.mdx`)));
  }
});

test('aliases cannot overwrite public content', t => {
  const f = fixture(t);
  f.write('content/ko/wiki/guide/public.md', 'collision');
  assert.throws(() => prepareContent(f.root, 'development'), /collision/);
});

test('raw Docusaurus commands cannot publish development staging or stale policies', t => {
  const f = fixture(t);
  prepareContent(f.root, 'development');
  assert.throws(() => assertPreparedContent(f.root), /Content mode/);
  prepareContent(f.root, 'public');
  assert.doesNotThrow(() => assertPreparedContent(f.root));
  f.write('.docignore', 'content/*/wiki/_other/');
  assert.throws(() => assertPreparedContent(f.root), /Content mode/);
});
