import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import * as yaml from 'js-yaml';
import {createLastUpdateReader, withLastUpdate} from './content-last-update.mjs';
import {prepareContent} from './prepare-content.mjs';
import {mergeKoreanFallbackDocs} from './build-wiki-graph.mjs';
import {getVcsPreset, readLastUpdateData} from '@docusaurus/utils';

const initial = '2024-03-01T10:00:00+09:00';
const updated = '2025-06-02T10:00:00+09:00';
const frontmatter = text => yaml.load(text.match(/^---\n([\s\S]*?)\n---/)[1]);

test('native Docusaurus dates keep staged values and never fabricate missing dates', async () => {
  const config = fs.readFileSync(new URL('../docusaurus.config.ts', import.meta.url), 'utf8');
  assert.match(config, /experimental_vcs:\s*['"]disabled['"]/);
  const options = {showLastUpdateTime: true, showLastUpdateAuthor: false};
  const vcs = getVcsPreset('disabled');
  for (const source of ['.content-build/ko/wiki/new.md', 'i18n/en/docusaurus-plugin-content-docs/current/new.md', '.content-build/ko/blog/new.mdx']) {
    assert.equal((await readLastUpdateData(source, options, undefined, vcs)).lastUpdatedAt, null);
    assert.equal((await readLastUpdateData(source, options, {date: initial}, vcs)).lastUpdatedAt, Date.parse(initial));
  }
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-last-update-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), value); };
  git('init'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Test');
  const commit = date => {
    git('add', '.');
    execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture'], {
      cwd: root, stdio: 'pipe', env: {...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date},
    });
  };
  write('.docignore', 'content/*/wiki/_guide/\n');
  return {root, git, write, commit};
}

test('generated front matter preserves bodies, fields, explicit dates and date-less files', () => {
  const body = '\n# Hello\n\n<Component />\n';
  const source = `---\r\ntitle: Hello\r\nlast_update:\r\n  author: Editor\r\n---\r\n${body}`;
  const result = withLastUpdate(source, 'example.mdx', () => initial);
  assert.equal(frontmatter(result).title, 'Hello');
  assert.deepEqual(frontmatter(result).last_update, {author: 'Editor', date: initial});
  assert.ok(result.endsWith(body));
  const explicit = '---\nlast_update:\n  date: 2020-01-01\n---\nManual';
  assert.equal(withLastUpdate(explicit, 'example.md', () => { throw Error('must not read Git'); }), explicit);
  assert.equal(withLastUpdate(body, 'new.md', () => undefined), body);
  assert.equal(frontmatter(withLastUpdate(body, 'old.md', () => initial)).last_update.date, initial);
  assert.throws(() => withLastUpdate('---\nlast_update: invalid\n---\n', 'bad.md', () => initial), /Invalid last_update/);
});

test('source dates survive staging, aliases, locale fallback and repeat builds without editing originals', t => {
  const f = fixture(t);
  const ko = 'content/ko/wiki/shared.md';
  const en = 'content/en/wiki/shared.md';
  f.write(ko, '---\ntitle: 한국어\n---\nBody');
  f.write('content/ko/wiki/fallback.md', '# Fallback');
  f.write('content/ko/wiki/_guide/test.md', '# Guide');
  f.write('content/ko/blog/post.mdx', '---\ntitle: Blog\n---\n<Component />');
  f.commit(initial);
  f.write(en, '---\ntitle: English\n---\nEnglish body');
  f.commit(updated);
  const original = fs.readFileSync(path.join(f.root, ko), 'utf8');
  f.write('content/ko/wiki/new.md', '# Uncommitted');
  f.write(ko, `${original}\nUncommitted edit`);
  prepareContent(f.root, 'development');
  const read = file => fs.readFileSync(path.join(f.root, '.content-build', file), 'utf8');
  for (const file of ['ko/wiki/shared.md', 'ko/wiki/guide/test.md', 'ko/blog/post.mdx']) {
    assert.equal(frontmatter(read(file)).last_update.date, initial);
  }
  assert.equal(frontmatter(read('en/wiki/shared.md')).last_update.date, updated);
  assert.equal(read('ko/wiki/new.md'), '# Uncommitted');
  const enRoot = path.join(f.root, '.content-build/en/wiki');
  mergeKoreanFallbackDocs(path.join(f.root, '.content-build/ko/wiki'), enRoot);
  assert.equal(frontmatter(read('en/wiki/fallback.md')).last_update.date, initial);
  assert.match(read('en/wiki/fallback.md'), /English version unavailable/);
  assert.equal(frontmatter(read('en/wiki/shared.md')).last_update.date, updated);
  const staged = read('ko/wiki/shared.md');
  prepareContent(f.root, 'development');
  assert.equal(read('ko/wiki/shared.md'), staged);
  assert.equal(fs.readFileSync(path.join(f.root, ko), 'utf8'), `${original}\nUncommitted edit`);
});

test('new readers see new commits and committed renames; shallow history fails explicitly', t => {
  const f = fixture(t);
  assert.equal(createLastUpdateReader(f.root)(path.join(f.root, 'new.md')), undefined);
  f.write('content/ko/wiki/original.md', '# Original'); f.commit(initial);
  const first = createLastUpdateReader(f.root);
  assert.equal(first(path.join(f.root, 'content/ko/wiki/original.md')), initial);
  f.git('mv', 'content/ko/wiki/original.md', 'content/ko/wiki/renamed.md'); f.commit(updated);
  assert.equal(createLastUpdateReader(f.root)(path.join(f.root, 'content/ko/wiki/renamed.md')), updated);
  const clone = path.join(f.root, 'shallow-clone');
  f.git('clone', '--depth=1', `file://${f.root}`, clone);
  assert.throws(() => createLastUpdateReader(clone), /full Git history/);
});

test('a source archive without Git does not invent dates', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-no-git-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  assert.equal(createLastUpdateReader(root)(path.join(root, 'new.md')), undefined);
});
