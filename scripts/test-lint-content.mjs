import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {contentViolations, formatContent} from './content-format/v1.mjs';
import {fixDocument, lintContent, lintDocument, lintTagRegistry, loadLayouts, loadTagRegistry, parseDocument} from './lint-content.mjs';
import {formatReport, reportContent} from './report-content.mjs';
import {prepareContent} from './prepare-content.mjs';

const repo = path.resolve(import.meta.dirname, '..');
const registry = loadLayouts(repo);
const STAMP = 'profile_layout: {kind: reference, version: 1}';

const doc = (body, front = STAMP) => `---\ntitle: "🍓 Pi"\ntags: [raspberry-pi]\ntype: Reference\n${front}\n---\n\n${body}`;
const VISUAL = '![thumbnail](./assets/pi.png)\n\n';
const GOOD = doc(`${VISUAL}## Definition\n\n- a computer\n\n## Usage\n\n- homelab\n\n## References\n\n- https://example.com\n`);
const run = (source, options = {assets: false}) => lintDocument(repo, path.join(repo, 'content/ko/wiki/d/x.md'), source, registry, options).diagnostics;
const rules = diagnostics => diagnostics.map(item => item.rule);

test('the reference layout is registered and both scaffolds satisfy its rules', () => {
  assert.ok(registry.has('reference@1'));
  for (const locale of ['ko', 'en']) {
    const file = path.join(repo, `content/_templates/v1/${locale}/wiki-reference.md`);
    const template = fs.readFileSync(file, 'utf8').replaceAll('TITLE_VALUE', '"🍓 Pi"');
    assert.deepEqual(run(template).filter(item => item.severity === 'error'), [], locale);
    assert.match(template, /^profile_layout: \{kind: reference, version: 1\}$/m);
  }
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
  assert.deepEqual(run(doc(body, `${STAMP}\nstatus: draft`)).map(item => [item.rule, item.severity]), [['template-heading-recommended', 'warn']]);
  assert.deepEqual(run(doc(body, `${STAMP}\nstatus: reviewed`)).map(item => [item.rule, item.severity]), [['template-heading-recommended', 'error']]);
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
  const fence = '```anatomy\n/img/figures/pi\n```\n\n';
  assert.deepEqual(rules(run(doc(`${fence}## Definition\n\nx\n\n## References\n\nx\n`))).filter(rule => rule === 'template-intro-visual'), []);
  const diagram = '```mermaid\ngraph TD; A-->B\n```\n\n';
  assert.deepEqual(rules(run(doc(`${diagram}## Definition\n\nx\n\n## References\n\nx\n`))).filter(rule => rule === 'template-intro-visual'), []);
});

test('an image after the first H2 is not an intro visual', () => {
  assert.ok(rules(run(doc('## Definition\n\n![late](./a.png)\n\n## References\n\nx\n'))).includes('template-intro-visual'));
});

test('template declarations are validated and versions are immutable inputs', () => {
  assert.ok(rules(run(doc(GOOD, 'profile_layout: nope'))).includes('template-invalid'));
  assert.ok(rules(run(doc(`${VISUAL}## Definition\n\nx\n`, 'profile_layout: {kind: reference, version: 9}'))).includes('template-unknown'));
  const outdated = new Map(registry); outdated.set('reference@1', {...registry.get('reference@1'), latest: 2});
  const result = lintDocument(repo, path.join(repo, 'content/ko/wiki/d/x.md'), GOOD, outdated, {assets: false}).diagnostics;
  assert.deepEqual(result.map(item => item.rule), ['template-outdated']);
});

test('front matter required by the template must exist', () => {
  const source = `---\ntitle: "🍓 Pi"\n${STAMP}\n---\n\n` + VISUAL + '## Definition\n\nx\n\n## References\n\nx\n';
  assert.deepEqual(run(source).filter(item => item.rule === 'template-front-matter').map(item => item.message.match(/"(\w+)"/)[1]).sort(), ['tags', 'type']);
});

test('a title-only translation is not checked for body structure', () => {
  assert.deepEqual(run(doc('')), []);
});

test('baseline rules apply to documents without a template', () => {
  const found = rules(run('---\ntitle: "📄 A"\n---\n\n## One\n\n#### Deep\n\n## One\n'));
  for (const rule of ['heading-level-skip', 'heading-duplicate-h2']) assert.ok(found.includes(rule), rule);
  assert.ok(!found.some(rule => rule.startsWith('template-')));
});

test('anatomy figure folders need both a dark and a light page', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const source = '---\ntitle: "📄 A"\n---\n\n```anatomy\n/img/figures/pi\n```\n';
  const lint = text => lintDocument(root, path.join(root, 'content/ko/wiki/a.md'), text ?? source, registry).diagnostics.map(item => item.message);
  assert.deepEqual(lint(), ['Missing static/img/figures/pi/index.html', 'Missing static/img/figures/pi/light/index.html']);
  fs.mkdirSync(path.join(root, 'static/img/figures/pi'), {recursive: true});
  fs.writeFileSync(path.join(root, 'static/img/figures/pi/index.html'), '');
  assert.deepEqual(lint(), ['Missing static/img/figures/pi/light/index.html']);
  assert.match(lint('---\ntitle: "📄 A"\n---\n\n```anatomy\npi\n```\n')[0], /root-relative static directory/);
  assert.match(lint('---\ntitle: "📄 A"\n---\n\n```anatomy\n/a\n/b\n```\n')[0], /exactly one line/);
});

test("'''anatomy is the same block as a backtick fence", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const apostrophes = `---\ntitle: "📄 A"\n---\n\n'''anatomy\n/img/figures/pi\n'''\n\n## One\n\nx\n`;
  const parsed = parseDocument(apostrophes);
  assert.deepEqual(parsed.fences.map(fence => [fence.lang, fence.value]), [['anatomy', '/img/figures/pi']]);
  assert.deepEqual(parsed.headings.map(heading => [heading.text, heading.line]), [['One', 9]], 'line numbers are preserved');
  const missing = lintDocument(root, path.join(root, 'content/ko/wiki/a.md'), apostrophes, registry).diagnostics.map(item => item.rule);
  assert.deepEqual(missing, ['anatomy-asset-missing', 'anatomy-asset-missing']);
  const inCode = parseDocument('---\ntitle: "📄 A"\n---\n\n```text\n\'\'\'anatomy\n/img/figures/pi\n\'\'\'\n```\n');
  assert.deepEqual(inCode.fences.map(fence => fence.lang), ['text'], 'an example inside a code block is not a macro');
  // as the intro visual of a layout page
  const page = `---\ntitle: "🍓 Pi"\ntags: [a]\ntype: Reference\n${STAMP}\n---\n\n'''anatomy\n/img/figures/pi\n'''\n\n## Definition\n\nx\n\n## References\n\nx\n`;
  assert.ok(!rules(run(page)).includes('template-intro-visual'));
});

test('the anatomy macro takes exactly one root-relative static directory', () => {
  const {macros, normalizeMacroFences} = createRequire(import.meta.url)('../plugins/content-templates/macros.cjs');
  assert.deepEqual(macros.anatomy.parse('/img/figures/raspberry-pi/\n'), {path: '/img/figures/raspberry-pi'});
  assert.deepEqual(macros.anatomy.parse('  /img/figures/a.b_c-d  '), {path: '/img/figures/a.b_c-d'});
  for (const bad of ['', 'raspberry-pi', 'img/figures/x', '/a/../b', '/a/./b', '//x', '/a//b', '/a b', '/a\n/b', '/img/figures/x?y=1', '/img/figures/x#top', '/']) {
    assert.throws(() => macros.anatomy.parse(bad), /anatomy/, JSON.stringify(bad));
  }
  const text = "a\n'''anatomy\n/x/y\n'''\nb\n```md\n'''anatomy\n/x/z\n'''\n```\n'''other\nq\n'''\n'''anatomy\n/unclosed\n";
  const out = normalizeMacroFences(text);
  assert.equal(out.split('\n').length, text.split('\n').length);
  assert.match(out, /^```anatomy\n\/x\/y\n```$/m);
  assert.match(out, /```md\n'''anatomy\n\/x\/z\n'''\n```/, 'an example inside a code fence stays as written');
  assert.match(out, /'''other\nq\n'''/, 'only known macros are rewritten');
  assert.match(out, /'''anatomy\n\/unclosed\n$/, 'an unclosed block is left alone');
});

test('the remark plugin turns the macro into a ContentTemplate and fails on a bad path', () => {
  const plugin = createRequire(import.meta.url)('../plugins/content-templates/remark-plugin.cjs');
  const failures = [];
  const run = value => {
    const tree = {type: 'root', children: [{type: 'code', lang: 'anatomy', value, position: {}}]};
    plugin()(tree, {fail: (message) => { failures.push(message); throw new Error(message); }});
    return tree.children[0];
  };
  const node = run('/img/figures/pi');
  assert.equal(node.type, 'mdxJsxFlowElement');
  assert.deepEqual(node.attributes.map(attribute => [attribute.name, attribute.value]), [['type', 'anatomy'], ['itemsJson', '[{"path":"/img/figures/pi"}]']]);
  assert.throws(() => run('pi'), /Invalid anatomy macro/);
  assert.equal(failures.length, 1);
});

test('content:check validates the anatomy macro in either spelling', () => {
  const doc = body => `---\ntitle: "📄 A"\nprofile_template: {kind: wiki, version: 1}\nprofile_format: 1\n---\n\n${body}\n`;
  const file = 'content/ko/wiki/d/a.md';
  assert.deepEqual(contentViolations(doc('```anatomy\n/img/figures/pi\n```'), file), []);
  assert.deepEqual(contentViolations(doc("'''anatomy\n/img/figures/pi\n'''"), file), []);
  assert.match(contentViolations(doc('```anatomy\npi\n```'), file)[0], /^CONTENT-004: anatomy path/);
  assert.match(contentViolations(doc("'''anatomy\npi\n'''"), file)[0], /^CONTENT-004: anatomy path/);
});

test("staging rewrites '''anatomy to a backtick fence, including a borrowed body", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-stage-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), text); };
  write('.docignore', 'content/_templates/\n');
  write('content/ko/wiki/index.md', '---\ntitle: "🏠 홈"\n---\n\nHome');
  write('content/en/wiki/index.md', '---\ntitle: "🏠 Home"\n---\n');
  write('content/ko/wiki/d/pi.md', `---\ntitle: "🍓 Pi"\n---\n\n'''anatomy\n/img/figures/pi\n'''\n\nText\n`);
  write('content/en/wiki/d/pi.md', '---\ntitle: "🍓 Pi"\n---\n');
  prepareContent(root, 'public');
  for (const locale of ['ko', 'en']) {
    const staged = fs.readFileSync(path.join(root, '.content-build', locale, 'wiki/d/pi.md'), 'utf8');
    assert.match(staged, /```anatomy\n\/img\/figures\/pi\n```/, locale);
    assert.doesNotMatch(staged, /'''anatomy/, locale);
  }
});

test('locales must agree on template and H2 sequence once both have a body', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'design-system'), path.join(root, 'design-system'), {recursive: true});
  const write = (locale, text) => { const file = path.join(root, `content/${locale}/wiki/d/pi.md`); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  write('ko', GOOD);
  write('en', doc(`${VISUAL}## Definition\n\nx\n\n## Details\n\nx\n\n## References\n\nx\n`));
  const found = lintContent(root, {assets: false});
  assert.ok(found.some(item => item.rule === 'template-locale-parity' && item.file.includes('/en/')));
  write('en', doc(''));
  assert.deepEqual(lintContent(root, {assets: false}).filter(item => item.rule === 'template-locale-parity'), []);
});

test('scaffolds are never staged or published, in any content mode', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'content/_templates'), path.join(root, 'content/_templates'), {recursive: true});
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), text); };
  write('.docignore', 'content/*/wiki/_guide/\ncontent/_templates/\n');
  for (const locale of ['ko', 'en']) write(`content/${locale}/wiki/index.md`, '---\ntitle: "🏠 Home"\n---\n\nHome');
  for (const mode of ['public', 'development']) {
    prepareContent(root, mode);
    const staged = fs.readdirSync(path.join(root, '.content-build'), {recursive: true}).map(String);
    assert.ok(staged.some(file => file.endsWith('index.md')), 'content is staged');
    assert.deepEqual(staged.filter(file => /_templates|wiki-reference|wiki\.md\b.*TITLE/.test(file)), [], mode);
  }
});

test('every rendered document in this repository passes the lint', () => {
  const errors = lintContent(repo).filter(item => item.severity === 'error');
  assert.deepEqual(errors, []);
});

test('front matter image must exist, and Anatomy reference pages should have a thumbnail', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-lint-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'static/img/figures/pi/light'), {recursive: true});
  fs.writeFileSync(path.join(root, 'static/img/figures/pi/index.html'), '');
  fs.writeFileSync(path.join(root, 'static/img/figures/pi/light/index.html'), '');
  const fence = '```anatomy\n/img/figures/pi\n```\n';
  const lint = front => lintDocument(root, path.join(root, 'content/ko/wiki/d/a.md'), `---\ntitle: "📄 A"\ntype: Reference\n${front}---\n\n${fence}`, registry).diagnostics.map(item => `${item.severity}:${item.rule}`);
  assert.deepEqual(lint(''), ['warn:anatomy-thumbnail']);
  assert.deepEqual(lint('image: /img/figures/pi/thumbnail.png\n'), ['error:image-missing']);
  fs.writeFileSync(path.join(root, 'static/img/figures/pi/thumbnail.png'), '');
  assert.deepEqual(lint('image: /img/figures/pi/thumbnail.png\n'), []);
});

test('--fix repairs only the unambiguous legacy Name section and is idempotent', () => {
  const front = '---\ntitle: "📄 A"\n---\n\n';
  const clean = fixDocument(`${front}## Name\n- Istio; 이스티오\n\n\n## Definition\n- 서비스 메시 구현체\n\n## Usage\n- x\n`);
  assert.equal(clean.text, `${front}## Definition\n- 서비스 메시 구현체\n- 표기: Istio; 이스티오\n\n## Usage\n- x\n`);
  assert.deepEqual(clean.fixes.map(fix => fix.rule), ['legacy-name-section']);
  assert.equal(fixDocument(clean.text).fixes.length, 0);
  assert.match(fixDocument(`${front}## Name\n- Istio\n\n## Definition\n- x\n`, 'en').text, /- Also written: Istio/);
  for (const name of ['## Name\n- a\n- b\n', '## Name\n- a\n\t- nested\n', '## Name\n- a\n\n### Origin\n- b\n']) {
    const source = `${front}${name}\n## Definition\n- x\n`;
    assert.equal(fixDocument(source).text, source, name);
  }
});

test('content:new --layout reference scaffolds a stamped page that passes the lint', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-scaffold-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.cpSync(path.join(repo, 'design-system'), path.join(root, 'design-system'), {recursive: true});
  fs.cpSync(path.join(repo, 'content/_templates'), path.join(root, 'content/_templates'), {recursive: true});
  const make = (...args) => spawnSync(process.execPath, [path.join(repo, 'scripts/content-new.mjs'), ...args], {cwd: root, encoding: 'utf8'});
  const made = make('--kind', 'wiki', '--locale', 'ko', '--layout', 'reference', '--path', 'd/mini-pc.md', '--title', '🖥️ 미니 PC');
  assert.equal(made.status, 0, made.stderr);
  const parsed = parseDocument(fs.readFileSync(path.join(root, 'content/ko/wiki/d/mini-pc.md'), 'utf8'));
  assert.deepEqual(parsed.frontMatter.profile_layout, {kind: 'reference', version: 1});
  assert.deepEqual(parsed.frontMatter.profile_template, {kind: 'wiki', version: 1});
  assert.equal(parsed.frontMatter.title, '🖥️ 미니 PC');
  assert.deepEqual(lintContent(root, {assets: false}).filter(item => item.severity === 'error'), []);
  assert.notEqual(make('--kind', 'wiki', '--locale', 'ko', '--layout', 'reference', '--path', 'd/mini-pc.md', '--title', '🖥️ 미니 PC').status, 0, 'refuses overwrite');
  assert.match(make('--kind', 'wiki', '--locale', 'en', '--layout', 'nope', '--path', 'd/x.md', '--title', '🖥️ X').stderr, /Unknown layout/);
  assert.match(make('--kind', 'blog', '--locale', 'en', '--layout', 'reference', '--path', '2026-01-01-x.md', '--title', 'X').stderr, /wiki pages only/);
});

test('the coverage report lists reference pages and what each is missing', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-report-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (name, text) => { const file = path.join(root, 'content/ko/wiki/d', name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, text); };
  write('full.md', `---\ntitle: "🍓 Full"\ntype: Reference\n${STAMP}\nstatus: draft\nimage: /a.png\n---\n\n${VISUAL}## Definition\n\nx\n\n## Understanding\n\nx\n\n## References\n\nx\n`);
  write('old.md', '---\ntitle: "📄 Old"\ntype: Reference\nstatus: draft\n---\n\n## Definition\n- x\n');
  write('index.md', '---\ntitle: "📚 Docs"\n---\n\nindex');
  write('note.md', '---\ntitle: "📄 Note"\n---\n\nnot a reference');
  const rows = reportContent(root);
  assert.deepEqual(rows.map(row => row.slug), ['full', 'old']);
  assert.deepEqual({template: rows[0].template, status: rows[0].status, visual: rows[0].visual, thumbnail: rows[0].thumbnail, understanding: rows[0].understanding, usage: rows[0].usage, references: rows[0].references},
    {template: 'reference@1', status: 'draft', visual: 'image', thumbnail: true, understanding: true, usage: false, references: true});
  assert.equal(rows[1].template, null);
  const text = formatReport(rows);
  assert.match(text, /\| full \| reference@1 \| draft \| image \| ✓ \| ✓ \| – \| – \| ✓ \|/);
  assert.match(text, /\| old \| legacy \|/);
  assert.match(text, /Missing both Understanding and Usage: old$/);
});

test("content:format writes the apostrophe anatomy block as a backtick fence and leaves code examples alone", async () => {
  const file = 'content/ko/wiki/d/a.md';
  const source = "---\ntitle: \"📄 A\"\nprofile_template: {kind: wiki, version: 1}\nprofile_format: 1\n---\n\n'''anatomy\n/img/figures/pi\n'''\n\n```text\n'''anatomy\n/img/figures/pi\n'''\n```\n";
  const formatted = await formatContent(source, file);
  assert.match(formatted, /^```anatomy\n\/img\/figures\/pi\n```$/m);
  assert.match(formatted, /```text\n'''anatomy\n\/img\/figures\/pi\n'''\n```/, 'the documented example is untouched');
  assert.equal(await formatContent(formatted, file), formatted, 'idempotent');
  assert.notEqual(formatted, source, 'content:check sees the apostrophe spelling as needing a format pass');
});

function tagFixture(t, registryYaml) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'profile2-tags-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), text); };
  write('data/tags.yml', registryYaml);
  return {root, write};
}
const registryRules = registry => lintTagRegistry(registry).map(item => `${item.rule}`);

test('the repository tag registry follows the tag rules', () => {
  assert.deepEqual(lintTagRegistry(loadTagRegistry(repo)), []);
});

test('tag labels are one English label per tag and must spell the slug', t => {
  const {root} = tagFixture(t, [
    'tags:',
    '  raspberry-pi:', '    label: Raspberry_Pi',
    '  mini-pc:', '    label: Mini_PC',
    '  infra:', '    label: {ko: 인프라, en: Infra}',
    '  on-premise:', '    label: 온프레미스',
    '  argo-cd:', '    label: Argo CD',
    '  tech-note:', '    label: Technical_Notes',
    '  Bad_Slug:', '    label: Bad_Slug',
    '  mini-pcs:', '    label: mini_pc',
    '',
  ].join('\n'));
  const found = lintTagRegistry(loadTagRegistry(root));
  const by = slug => found.filter(item => item.message.includes(`"${slug}"`) || item.message.includes(slug)).map(item => item.rule);
  assert.ok(by('infra').includes('tag-label-type'), 'a per-locale label map is rejected');
  assert.ok(registryRules(loadTagRegistry(root)).includes('tag-label-format'), 'Korean or spaced labels are rejected');
  assert.ok(found.some(item => item.rule === 'tag-label-format' && /온프레미스/.test(item.message)));
  assert.ok(found.some(item => item.rule === 'tag-label-format' && /Argo CD/.test(item.message)));
  assert.ok(found.some(item => item.rule === 'tag-label-slug' && /Technical_Notes/.test(item.message)), 'label must spell the slug');
  assert.ok(found.some(item => item.rule === 'tag-slug-format' && /Bad_Slug/.test(item.message)));
  assert.ok(found.some(item => item.rule === 'tag-label-duplicate' && /mini_pc/.test(item.message)), 'labels are unique ignoring case');
  assert.ok(!found.some(item => /raspberry-pi/.test(item.message)), 'a correct tag has no findings');
  assert.ok(found.every(item => item.severity === 'error' && item.file === 'data/tags.yml' && item.line >= 1));
});

test('tag aliases are kebab-case and never collide with a tag or another alias', t => {
  const {root} = tagFixture(t, [
    'tags:',
    '  kubernetes:', '    label: Kubernetes', '    aliases: [k8s, Kube_Rnetes]',
    '  k8s-tools:', '    label: K8s_Tools', '    aliases: [k8s]',
    '  helm:', '    label: Helm', '    aliases: [k8s-tools]',
    '',
  ].join('\n'));
  const messages = lintTagRegistry(loadTagRegistry(root)).map(item => `${item.rule}: ${item.message}`).join('\n');
  assert.match(messages, /tag-alias-format: Alias "Kube_Rnetes"/);
  assert.match(messages, /tag-alias-collision: Alias "k8s" is claimed by/);
  assert.match(messages, /tag-alias-collision: Alias "k8s-tools" is also a registered tag/);
});

test('document tags must be registered kebab-case slugs without duplicates', t => {
  const {root} = tagFixture(t, 'tags:\n  raspberry-pi:\n    label: Raspberry_Pi\n    aliases: [rpi]\n  on-premise:\n    label: On_Premise\n    aliases: [onpremise]\n');
  const tags = loadTagRegistry(root);
  const lint = front => lintDocument(root, path.join(root, 'content/ko/wiki/d/a.md'), `---\ntitle: "📄 A"\n${front}---\n\nBody\n`, registry, {assets: false, tags}).diagnostics.map(item => `${item.rule}@${item.line}`);
  assert.deepEqual(lint('tags:\n  - raspberry-pi\n  - on-premise\n'), []);
  assert.deepEqual(lint('tags: [raspberry-pi]\n'), []);
  assert.deepEqual(lint(''), [], 'no tags is fine');
  assert.deepEqual(lint('tags:\n  - Raspberry_Pi\n'), ['tag-format@4']);
  assert.deepEqual(lint('tags:\n  - 라즈베리파이\n'), ['tag-format@4']);
  assert.deepEqual(lint('tags:\n  - raspberry-pi\n  - raspberry-pi\n'), ['tag-duplicate@4']);
  assert.deepEqual(lint('tags:\n  - unknown-tag\n'), ['tag-unregistered@4']);
  const alias = lintDocument(root, path.join(root, 'content/ko/wiki/d/a.md'), '---\ntitle: "📄 A"\ntags:\n  - onpremise\n---\n\nBody\n', registry, {assets: false, tags}).diagnostics;
  assert.match(alias[0].message, /old alias; use "on-premise"/);
});

test('the same document carries the same tags in every language', t => {
  const {root, write} = tagFixture(t, 'tags:\n  raspberry-pi:\n    label: Raspberry_Pi\n  infra:\n    label: Infra\n  mini-pc:\n    label: Mini_PC\n');
  const page = tags => `---\ntitle: "🍓 Pi"\n${tags}---\n\nBody\n`;
  write('content/ko/wiki/d/pi.md', page('tags:\n  - raspberry-pi\n  - infra\n'));
  write('content/en/wiki/d/pi.md', page('tags:\n  - infra\n  - mini-pc\n'));
  const parity = () => lintContent(root, {assets: false}).filter(item => item.rule === 'tag-locale-parity');
  assert.equal(parity().length, 1);
  assert.match(parity()[0].message, /\[infra, mini-pc\] vs \[infra, raspberry-pi\]/);
  write('content/en/wiki/d/pi.md', page('tags: [infra, raspberry-pi]\n'));
  assert.deepEqual(parity(), [], 'order does not matter');
  write('content/en/wiki/d/pi.md', '---\ntitle: "🍓 Pi"\n---\n');
  assert.deepEqual(parity(), [], 'a title-only English page borrows the Korean tags');
});

test('tag problems are never auto-fixed', () => {
  const source = '---\ntitle: "📄 A"\ntags:\n  - Raspberry_Pi\n  - onpremise\n---\n\n## Name\n- Pi\n\n## Definition\n- x\n';
  const fixed = fixDocument(source);
  assert.match(fixed.text, /tags:\n  - Raspberry_Pi\n  - onpremise\n/);
  assert.deepEqual(fixed.fixes.map(fix => fix.rule), ['legacy-name-section']);
});
