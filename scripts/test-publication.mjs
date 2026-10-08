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
  f.write('data/career/projects/example.yaml', 'basics: {}');
  f.write('data/tags.yml', 'tags: {}');
  f.write('data/.hidden.yml', 'hidden: true');
  const paths = authoredWatchPaths(f.root);
  for (const file of ['data/career/projects/example.yaml', 'data/tags.yml', 'content/en/wiki/_guide/authoring.mdx']) assert.ok(paths.has(path.join(f.root, file)));
  assert.equal(paths.has(path.join(f.root, 'data/.hidden.yml')), false);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-publication-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), value); };
  write('.docignore', '# Both locales\ncontent/*/wiki/_guide/\ncontent/*/wiki/_design/\ncontent/*/blog/_internal/\ncontent/*/wiki/private.md\n');
  for (const locale of ['ko', 'en']) {
    write(`content/${locale}/wiki/index.md`, '# 📄 Home\n\npublic');
    write(`content/${locale}/wiki/_guide/authoring.mdx`, '# 🧭 Authoring\n\ndevelopment only');
    write(`content/${locale}/wiki/_guide/assets/example.txt`, 'development asset');
    write(`content/${locale}/wiki/_design/index.md`, '# 🛠️ Design\n\ndesign');
    write(`content/${locale}/wiki/private.md`, '# 📄 Private\n\nprivate');
    write(`content/${locale}/blog/_internal/test.md`, '# Internal\n\ninternal blog');
  }
  const staged = file => path.join(root, '.content-build', file);
  return {root, write, staged, read: file => fs.readFileSync(staged(file), 'utf8')};
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
  for (const locale of ['ko', 'en']) f.write(`content/${locale}/wiki/guide/public.md`, '# 📄 Public\n\ncollision');
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

test('every document needs an authored English title', t => {
  const f = fixture(t);
  f.write('content/ko/blog/post.md', '---\ntitle: 한국어 글\n---\n본문');
  assert.throws(() => prepareContent(f.root, 'public'), /Missing English document with an English title: content\/en\/blog\/post\.md/);
  f.write('content/en/blog/post.md', '---\nslug: post\n---\nEnglish body');
  assert.throws(() => prepareContent(f.root, 'public'), /Missing English title: content\/en\/blog\/post\.md/);
  f.write('content/en/blog/post.md', '---\ntitle: 한국어 글\n---\n');
  assert.throws(() => prepareContent(f.root, 'public'), /English title contains Korean text/);
  // Excluded development notes are validated before publication filtering.
  fs.unlinkSync(path.join(f.root, 'content/en/blog/post.md')); fs.unlinkSync(path.join(f.root, 'content/ko/blog/post.md'));
  f.write('content/en/wiki/_guide/authoring.mdx', '---\nsidebar_position: 1\n---\nNo title');
  assert.throws(() => prepareContent(f.root, 'public'), /Missing English title/);
});

test('title-only documents borrow the English body first, then the Korean body', t => {
  const f = fixture(t);
  f.write('content/ko/blog/korean.md', '---\ntitle: 한국어 제목\nslug: korean\ntags: [ai]\n---\n# 한국어 제목\n\n한국어 본문');
  f.write('content/en/blog/korean.md', '---\ntitle: English title\n---\n\n');
  f.write('content/ko/wiki/english.md', '---\ntitle: 📄 한국어 제목\n---\n');
  f.write('content/en/wiki/english.md', '# 📄 English title\n\nEnglish body');
  f.write('content/ko/wiki/component.mdx', '---\ntitle: 📄 컴포넌트\n---\nimport A from "./a";\n\n<A />');
  f.write('content/en/wiki/component.md', '---\ntitle: 📄 Component\n---\n<!-- translation pending -->\n');
  prepareContent(f.root, 'public');
  const english = f.read('en/blog/korean.md');
  assert.match(english, /^---\ntitle: English title\nslug: korean\ntags:\n  - ai\n---/);
  assert.match(english, /English version unavailable[\s\S]*\n한국어 본문$/);
  assert.ok(!english.includes('# 한국어 제목'));
  const korean = f.read('ko/wiki/english.md');
  assert.match(korean, /title: 📄 한국어 제목/);
  assert.match(korean, /한국어 번역 준비 중[\s\S]*\nEnglish body$/);
  assert.equal(fs.existsSync(f.staged('en/wiki/component.md')), false);
  assert.match(f.read('en/wiki/component.mdx'), /title: 📄 Component[\s\S]*import A/);
  assert.deepEqual(JSON.parse(f.read('locale-fallbacks.json')), {
    'content/en/blog/korean.md': 'ko',
    'content/en/wiki/component.mdx': 'ko',
    'content/ko/wiki/english.md': 'en',
  });
});

test('a document without a body in any locale fails the build', t => {
  const f = fixture(t);
  f.write('content/ko/wiki/empty.md', '---\ntitle: 📄 빈 문서\n---\n');
  f.write('content/en/wiki/empty.md', '# 📄 Empty\n');
  assert.throws(() => prepareContent(f.root, 'public'), /No body in any locale for content\/ko\/wiki\/empty\.md[\s\S]*content\/en\/wiki\/empty\.md/);
});
