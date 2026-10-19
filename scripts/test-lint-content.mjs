import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fixDocument, lintContent, lintDocument, loadTemplates, parseDocument} from './lint-content.mjs';
import {scaffoldWiki} from './new-wiki.mjs';
import {formatReport, reportContent} from './report-content.mjs';
import {prepareContent} from './prepare-content.mjs';

const repo = path.resolve(import.meta.dirname, '..');
const registry = loadTemplates(repo);

const doc = (body, front = 'template: wiki-reference@1') => `---\ntitle: "🍓 Pi"\ntags: [raspberry-pi]\ntype: Reference\n${front}\n---\n\n${body}`;
const VISUAL = '![thumbnail](./assets/pi.png)\n\n';
const GOOD = doc(`${VISUAL}## Definition\n\n- a computer\n\n## Usage\n\n- homelab\n\n## References\n\n- https://example.com\n`);
const run = (source, options = {assets: false}) => lintDocument(repo, path.join(repo, 'content/ko/wiki/d/x.md'), source, registry, options).diagnostics;
const rules = diagnostics => diagnostics.map(item => item.rule);

test('wiki-reference@1 is registered and its template satisfies its own rules', () => {
  assert.ok(registry.has('wiki-reference@1'));
  const template = fs.readFileSync(path.join(repo, 'templates/wiki-reference/v1/template.md'), 'utf8');
  assert.deepEqual(run(template).filter(item => item.severity === 'error'), []);
  assert.match(template, /^template: wiki-reference@1$/m);
});

test('a conforming document passes', () => {
  assert.deepEqual(run(GOOD), []);
});

test('H2 names, order, duplicates and required sections are enforced', () => {
  assert.ok(rules(run(doc(`${VISUAL}## Definition\n\nx\n\n## Overview\n\nx\n\n## References\n\nx\n`))).includes('template-heading-unknown'));
  assert.ok(rules(run(doc(`${VISUAL}## References\n\nx\n\n## Definition\n\nx\n`))).includes('template-heading-order'));
  assert.ok(rules(run(doc(`${VISUAL}## Definition\n\nx\n\n## Definition\n\nx\n\n## References\n\nx\n`))).includes('template-heading-duplicate'));
  const missing = run(doc(`${VISUAL}## Definition\n\nx\n`));
  assert.ok(missing.some(item => item.rule === 'template-heading-missing' && /References/.test(item.message)));
});

test('missing Understanding and Usage is a warning only while the page is a draft', () => {
  const body = `${VISUAL}## Definition\n\nx\n\n## References\n\nx\n`;
  assert.deepEqual(run(doc(body, 'template: wiki-reference@1\nstatus: draft')).map(item => [item.rule, item.severity]), [['template-heading-recommended', 'warn']]);
  assert.deepEqual(run(doc(body, 'template: wiki-reference@1\nstatus: reviewed')).map(item => [item.rule, item.severity]), [['template-heading-recommended', 'error']]);
  assert.deepEqual(run(doc(body)).map(item => [item.rule, item.severity]), [['template-heading-recommended', 'error']]);
});

test('empty sections are errors, and an H3 counts as content', () => {
  assert.ok(rules(run(doc(`${VISUAL}## Definition\n\n## References\n\nx\n`))).includes('template-section-empty'));
  assert.deepEqual(rules(run(doc(`${VISUAL}## Definition\n\nx\n\n## Details\n\n### Specs\n\n## References\n\nx\n`))).filter(rule => rule === 'template-section-empty'), []);
});

test('an intro visual is required before the first H2, and fenced headings are ignored', () => {
  assert.ok(rules(run(doc('## Definition\n\nx\n\n## References\n\nx\n'))).includes('template-intro-visual'));
  assert.ok(rules(run(doc('```md\n## Not a heading\n```\n\n## Definition\n\nx\n\n## References\n\nx\n'))).includes('template-intro-visual'));
  assert.deepEqual(parseDocument(doc('```md\n## Not a heading\n```\n\n## Real\n\nx\n')).headings.map(item => item.text), ['Real']);
  const fence = '```anatomy-figure\n- name: pi\n  title: Pi\n```\n\n';
  assert.deepEqual(rules(run(doc(`${fence}## Definition\n\nx\n\n## References\n\nx\n`))).filter(rule => rule === 'template-intro-visual'), []);
  const diagram = '```mermaid\ngraph TD; A-->B\n```\n\n';
  assert.deepEqual(rules(run(doc(`${diagram}## Definition\n\nx\n\n## References\n\nx\n`))).filter(rule => rule === 'template-intro-visual'), []);
});

test('an image after the first H2 is not an intro visual', () => {
  assert.ok(rules(run(doc('## Definition\n\n![late](./a.png)\n\n## References\n\nx\n'))).includes('template-intro-visual'));
});

test('template declarations are validated and versions are immutable inputs', () => {
  assert.ok(rules(run(doc(GOOD, 'template: nope'))).includes('template-invalid'));
  assert.ok(rules(run(doc(`${VISUAL}## Definition\n\nx\n`, 'template: wiki-reference@9'))).includes('template-unknown'));
  const outdated = new Map(registry); outdated.set('wiki-reference@2', {...registry.get('wiki-reference@1'), key: 'wiki-reference@2', templateVersion: 2});
  const result = lintDocument(repo, path.join(repo, 'content/ko/wiki/d/x.md'), GOOD, outdated, {assets: false}).diagnostics;
  assert.deepEqual(result.map(item => item.rule), ['template-outdated']);
});

test('front matter required by the template must exist', () => {
  const source = '---\ntitle: "🍓 Pi"\ntemplate: wiki-reference@1\n---\n\n' + VISUAL + '## Definition\n\nx\n\n## References\n\nx\n';
  assert.deepEqual(run(source).filter(item => item.rule === 'template-front-matter').map(item => item.message.match(/"(\w+)"/)[1]).sort(), ['tags', 'type']);
});

test('a title-only translation is not checked for body structure', () => {
  assert.deepEqual(run(doc('')), []);
});

test('baseline rules apply to documents without a template', () => {
  const found = rules(run('---\ntitle: "📄 A"\n---\n\n## One \n\n#### Deep\n\n## One\n\n# Top\n'));
  for (const rule of ['heading-trailing-space', 'heading-level-skip', 'heading-duplicate-h2', 'heading-body-h1']) assert.ok(found.includes(rule), rule);
  assert.ok(!found.some(rule => rule.startsWith('template-')));
});

test('anatomy-figure assets must exist in both themes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const source = '---\ntitle: "📄 A"\n---\n\n```anatomy-figure\n- name: pi\n  title: Pi\n```\n';
  const lint = () => lintDocument(root, path.join(root, 'content/ko/wiki/a.md'), source, registry).diagnostics.map(item => item.message);
  assert.deepEqual(lint(), ['Missing static/anatomy/pi/index.html', 'Missing static/anatomy/pi-light/index.html']);
  fs.mkdirSync(path.join(root, 'static/anatomy/pi'), {recursive: true});
  fs.writeFileSync(path.join(root, 'static/anatomy/pi/index.html'), '');
  assert.deepEqual(lint(), ['Missing static/anatomy/pi-light/index.html']);
});

test('locales must agree on template and H2 sequence once both have a body', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'templates'), path.join(root, 'templates'), {recursive: true});
  const write = (locale, text) => { const file = path.join(root, `content/${locale}/wiki/d/pi.md`); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  write('ko', GOOD);
  write('en', doc(`${VISUAL}## Definition\n\nx\n\n## Details\n\nx\n\n## References\n\nx\n`));
  const found = lintContent(root, {assets: false});
  assert.ok(found.some(item => item.rule === 'template-locale-parity' && item.file.includes('/en/')));
  write('en', doc(''));
  assert.deepEqual(lintContent(root, {assets: false}).filter(item => item.rule === 'template-locale-parity'), []);
});

test('templates are never staged or published, in any content mode', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'templates'), path.join(root, 'templates'), {recursive: true});
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), text); };
  write('.docignore', 'content/*/wiki/_guide/\n');
  for (const locale of ['ko', 'en']) write(`content/${locale}/wiki/index.md`, '---\ntitle: "🏠 Home"\n---\n\nHome');
  for (const mode of ['public', 'development']) {
    prepareContent(root, mode);
    const staged = fs.readdirSync(path.join(root, '.content-build'), {recursive: true}).map(String);
    assert.ok(staged.some(file => file.endsWith('index.md')), 'content is staged');
    assert.deepEqual(staged.filter(file => /template|rules\.json|wiki-reference/.test(file)), [], mode);
  }
});

test('every rendered document in this repository passes the lint', () => {
  const errors = lintContent(repo).filter(item => item.severity === 'error');
  assert.deepEqual(errors, []);
});

test('front matter image must exist, and Anatomy reference pages should have a thumbnail', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'static/anatomy/pi'), {recursive: true});
  fs.writeFileSync(path.join(root, 'static/anatomy/pi/index.html'), '');
  fs.mkdirSync(path.join(root, 'static/anatomy/pi-light'), {recursive: true});
  fs.writeFileSync(path.join(root, 'static/anatomy/pi-light/index.html'), '');
  const fence = '```anatomy-figure\n- name: pi\n  title: Pi\n```\n';
  const lint = front => lintDocument(root, path.join(root, 'content/ko/wiki/d/a.md'), `---\ntitle: "📄 A"\ntype: Reference\n${front}---\n\n${fence}`, registry).diagnostics.map(item => `${item.severity}:${item.rule}`);
  assert.deepEqual(lint(''), ['warn:anatomy-thumbnail']);
  assert.deepEqual(lint('image: /anatomy/pi/thumbnail.png\n'), ['error:image-missing']);
  fs.writeFileSync(path.join(root, 'static/anatomy/pi/thumbnail.png'), '');
  assert.deepEqual(lint('image: /anatomy/pi/thumbnail.png\n'), []);
});

test('--fix repairs only unambiguous problems and is idempotent', () => {
  const front = '---\ntitle: "📄 A"\n---\n\n';
  const clean = fixDocument(`${front}## Name\n- Istio; 이스티오\n\n\n## Definition\n- 서비스 메시 구현체\n\n## Usage \n- x\n`);
  assert.equal(clean.text, `${front}## Definition\n- 서비스 메시 구현체\n- 표기: Istio; 이스티오\n\n## Usage\n- x\n`);
  assert.deepEqual(clean.fixes.map(fix => fix.rule).sort(), ['heading-trailing-space', 'legacy-name-section']);
  assert.equal(fixDocument(clean.text).fixes.length, 0);
  assert.match(fixDocument(`${front}## Name\n- Istio\n\n## Definition\n- x\n`, 'en').text, /- Also written: Istio/);
  for (const name of ['## Name\n- a\n- b\n', '## Name\n- a\n\t- nested\n', '## Name\n- a\n\n### Origin\n- b\n']) {
    const source = `${front}${name}\n## Definition\n- x\n`;
    assert.equal(fixDocument(source).text, source, name);
  }
});

test('--fix leaves headings inside code fences alone', () => {
  const source = '---\ntitle: "📄 A"\n---\n\n```md\n## Not a heading \n```\n';
  assert.equal(fixDocument(source).text, source);
});

test('scaffold creates a Korean skeleton and a title-only English page from the latest template', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-scaffold-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'templates'), path.join(root, 'templates'), {recursive: true});
  fs.mkdirSync(path.join(root, 'data'), {recursive: true});
  fs.writeFileSync(path.join(root, 'data/tags.yml'), 'tags:\n  infra:\n    label: {ko: 인프라, en: Infrastructure}\n');
  const result = scaffoldWiki(root, {slug: 'mini-pc', title: '🖥️ 미니 PC', enTitle: '🖥️ Mini PC', tags: ['infra', 'mini-pc']});
  assert.deepEqual(result.files, ['content/ko/wiki/d/mini-pc.md', 'content/en/wiki/d/mini-pc.md']);
  assert.equal(result.template, 'wiki-reference@1');
  assert.deepEqual(result.warnings, ['Tag "mini-pc" is not defined in data/tags.yml']);
  const ko = fs.readFileSync(path.join(root, result.files[0]), 'utf8');
  const parsed = parseDocument(ko);
  assert.equal(parsed.frontMatter.title, '🖥️ 미니 PC');
  assert.deepEqual(parsed.frontMatter.tags, ['infra', 'mini-pc']);
  assert.equal(parsed.frontMatter.template, 'wiki-reference@1');
  assert.deepEqual(parseDocument(fs.readFileSync(path.join(root, result.files[1]), 'utf8')).frontMatter, {title: '🖥️ Mini PC'});
  // the skeleton is a draft to be edited, but it is recognised and structurally sound apart from placeholders
  const found = lintContent(root, {assets: false}).filter(item => item.severity === 'error');
  assert.deepEqual(found, []);
  assert.throws(() => scaffoldWiki(root, {slug: 'mini-pc', title: '🖥️ 미니 PC', enTitle: '🖥️ Mini PC'}), /Already exists/);
});

test('scaffold validates names and titles', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-scaffold-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'templates'), path.join(root, 'templates'), {recursive: true});
  assert.throws(() => scaffoldWiki(root, {slug: 'Mini_PC', title: '🖥️ PC'}), /kebab-case/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: 'PC'}), /emoji/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: '🖥️ 미니 PC'}), /--en-title/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: '🖥️ 미니 PC', enTitle: '🖥️ 미니'}), /must not contain Korean/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: '🖥️ PC', tags: ['Mini PC']}), /Tags must be kebab-case/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: '🖥️ PC', template: 'nope'}), /Unknown template/);
  assert.throws(() => scaffoldWiki(root, {slug: 'pc', title: '🖥️ PC', template: 'wiki-reference@9'}), /Unknown template version/);
  assert.equal(fs.existsSync(path.join(root, 'content')), false);
});

test('the coverage report lists reference pages and what each is missing', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-report-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, text) => { const file = path.join(root, 'content/ko/wiki/d', name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  write('full.md', `---\ntitle: "🍓 Full"\ntype: Reference\ntemplate: wiki-reference@1\nstatus: draft\nimage: /a.png\n---\n\n${VISUAL}## Definition\n\nx\n\n## Understanding\n\nx\n\n## References\n\nx\n`);
  write('old.md', '---\ntitle: "📄 Old"\ntype: Reference\nstatus: draft\n---\n\n## Definition\n- x\n');
  write('index.md', '---\ntitle: "📚 Docs"\n---\n\nindex');
  write('note.md', '---\ntitle: "📄 Note"\n---\n\nnot a reference');
  const rows = reportContent(root);
  assert.deepEqual(rows.map(row => row.slug), ['full', 'old']);
  assert.deepEqual({template: rows[0].template, status: rows[0].status, visual: rows[0].visual, thumbnail: rows[0].thumbnail, understanding: rows[0].understanding, usage: rows[0].usage, references: rows[0].references},
    {template: 'wiki-reference@1', status: 'draft', visual: 'image', thumbnail: true, understanding: true, usage: false, references: true});
  assert.equal(rows[1].template, null);
  const text = formatReport(rows);
  assert.match(text, /\| full \| wiki-reference@1 \| draft \| image \| ✓ \| ✓ \| – \| – \| ✓ \|/);
  assert.match(text, /\| old \| legacy \|/);
  assert.match(text, /Missing both Understanding and Usage: old$/);
});
