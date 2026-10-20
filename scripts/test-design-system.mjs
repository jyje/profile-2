import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {formatContent, contentViolations, splitDocument, headingNodes} from './content-format/v1.mjs';
import {runContentFormat} from './content-format.mjs';
import {cssDesign, jsxDesign} from './design-system/rules.mjs';
import {runPrecommit, affectsRendering, assertBootstrapMatchesIndex} from './design-system/precommit.mjs';
import {prepareContent} from './prepare-content.mjs';
import {ignorePatterns, isDocIgnored} from '../plugins/content-visibility.cjs';
import {parseDocument, planLocaleFallbacks} from './locale-fallback.mjs';

const project = path.resolve(import.meta.dirname, '..');
function git(root, ...args) {return execFileSync('git', ['-C', root, ...args], {encoding:'utf8', env:{...process.env,GIT_CONFIG_GLOBAL:os.devNull,GIT_CONFIG_SYSTEM:os.devNull}});}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-design-test-'));
  t.after(() => fs.rm(root, {recursive:true,force:true}));
  const write = async (name, text) => {await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),text);};
  for (const name of ['design-system/format-v1.json','design-system/content-contract.json','scripts/content-format/v1.mjs','scripts/content-format.mjs','scripts/design-system/rules.mjs','scripts/design-system/lint.mjs','scripts/validate-wiki-titles.mjs','plugins/content-templates/remark-plugin.cjs','plugins/content-templates/schemas/v1.cjs','plugins/content-templates/macros.cjs']) {
    await write(name, await fs.readFile(path.join(project,name)));
  }
  for (const dir of ['src/pages','src/components/ContentTemplates','content/en','i18n/en/docusaurus-plugin-content-pages']) await write(`${dir}/.keep`, '');
  await write('README.md','Original\n');
  await write('.docignore','content/_templates/\n');
  await write('content/ko/wiki/d/note.md',await formatContent('---\ntitle: 📄 Note\n---\n\nA note.\n','content/ko/wiki/d/note.md',{migrate:true,root}));
  await write('content/en/wiki/d/note.md',await formatContent('---\ntitle: 📄 English note\n---\n','content/en/wiki/d/note.md',{migrate:true,root}));
  git(root,'init','-q'); git(root,'add','.');
  await fs.symlink(path.join(project,'node_modules'),path.join(root,'node_modules'),'dir');
  return {root,write};
}

test('formatter v1 is idempotent and preserves callouts, wiki links, fences, metadata and explicit dates', async () => {
  const source = '---\ntitle: 📄 Note\nlast_update:\n  date: 2024-01-01\ncustom: retained\n---\n\n> [!NOTE]\n> A [[wiki link]] and **text**.\n\n```python\n# This is code, not a heading\nprint("keep")\n```\n';
  const after = await formatContent(source,'content/ko/wiki/d/note.md',{migrate:true});
  assert.equal(after,await formatContent(after,'content/ko/wiki/d/note.md'));
  assert.match(after,/\[\[wiki link\]\]/); assert.match(after,/\[!NOTE\]/);
  assert.match(after,/# This is code, not a heading/);
  assert.equal(splitDocument(after).data.custom,'retained');
  assert.deepEqual(splitDocument(after).data.last_update,splitDocument(source).data.last_update);
  assert.deepEqual(contentViolations(after,'content/ko/wiki/d/note.md'),[]);
});
test('blog heading migration keeps the summary and demotes the duplicate header subtree without changing text or anchors', async () => {
  const source='---\ntitle: Blog\n---\n\n## Summary\n\nText.\n\n# Details {#stable}\n\n## Method\n\n```md\n# Keep this code\n```\n';
  const after=await formatContent(source,'content/ko/blog/2024-01-01-note.md',{migrate:true});
  assert.deepEqual(headingNodes(splitDocument(after).body).map(h=>[h.depth,h.text]),[[2,'Summary'],[2,'Details {#stable}'],[3,'Method']]);
  assert.match(after,/# Keep this code/);
});
test('future/foreign versions are rejected, not silently downgraded',async()=>{
  await assert.rejects(formatContent('---\nprofile_template: {kind: wiki, version: 2}\n---\nNote','content/ko/wiki/d/note.md',{migrate:true}),/Unsupported/);
});
test('generator applies versioned scaffolds, requires wiki emoji and refuses overwrite/traversal',async t=>{
  const {root}=await fixture(t);
  await fs.cp(path.join(project,'content/_templates'),path.join(root,'content/_templates'),{recursive:true});
  const run=args=>execFileSync(process.execPath,[path.join(project,'scripts/content-new.mjs'),...args],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const args=['--kind','wiki','--locale','ko','--path','d/new.md','--title','📄 New'];
  run(args);
  const target=path.join(root,'content/ko/wiki/d/new.md');
  const before=await fs.readFile(target,'utf8');
  assert.equal(splitDocument(before).data.profile_template.kind,'wiki');
  assert.throws(()=>run(args),/EEXIST/);
  assert.equal(await fs.readFile(target,'utf8'),before);
  assert.throws(()=>run(['--kind','wiki','--locale','ko','--path','../escape.md','--title','📄 New']),/Unsafe content path/);
  assert.throws(()=>run(['--kind','wiki','--locale','ko','--path','d/plain.md','--title','No emoji']),/emoji/);
});
test('raw colors, reusable spacing, external rel, button type and icon labels have precise fixes or failures',()=>{
  const source='.x{padding: .50rem 1.0rem;box-shadow:0 3px 12px rgb(10 30 38 / 7%)}';
  assert.ok(cssDesign(source,'x.css').errors.length);
  const fixed=cssDesign(source,'x.css',{fix:true}).text;
  assert.match(fixed,/var\(--site-space-2\) var\(--site-space-4\)/);
  assert.deepEqual(cssDesign(fixed,'x.css').errors,[]);
  assert.ok(cssDesign('.x{color:#fff}','x.css',{fix:true}).errors.length);
  const jsx='<><button><IconHome /></button><a target="_blank" href="https://example.com">Site</a></>';
  const result=jsxDesign(jsx,'x.tsx',{fix:true});
  assert.match(result.text,/type="button"/); assert.match(result.text,/rel="noreferrer"/);
  assert.ok(result.errors.some(e=>e.includes('accessible label')));
  assert.ok(cssDesign('body{margin:0}','x.css').errors.some(e=>e.includes('DS-006')));
  assert.ok(cssDesign('.x{animation:spin 1s linear infinite}','x.css').errors.some(e=>e.includes('DS-006')));
  assert.ok(cssDesign('/* prefers-reduced-motion */.x{animation:spin 1s linear infinite}','x.css').errors.some(e=>e.includes('DS-006')));
  assert.deepEqual(cssDesign('.x{animation:spin 1s linear infinite}@media(prefers-reduced-motion:reduce){.x{animation:none}}','x.css').errors,[]);
});
test('structured fences use the same schema as the Remark renderer; examples do not trigger inline-style rules',async()=>{
  const good=await formatContent('---\ntitle: 📄 Example\n---\n\n```tsx\n<div style={{padding: 1}} />\n```\n','content/ko/wiki/d/example.md',{migrate:true});
  assert.deepEqual(contentViolations(good,'content/ko/wiki/d/example.md'),[]);
  assert.ok(contentViolations(good+'\n```list-type-2x2\n- name: Missing description\n```\n','content/ko/wiki/d/example.md').some(e=>e.includes('CONTENT-004')));
});
test('canonical sources include ignored guides, exclude generated/hidden mirrors, and check fully after migration',async t=>{
  const {root,write}=await fixture(t);
  await write('content/ko/wiki/_guide/note.md','---\ntitle: 🧭 Guide\n---\n\nText');
  await write('hidden/private.md','Not part of public tooling');
  await write('i18n/en/docusaurus-plugin-content-docs/current/ignored.md','Generated');
  assert.ok((await runContentFormat({root})).failures.some(e=>e.includes('_guide')));
  assert.deepEqual((await runContentFormat({root,write:true,migrate:true})).failures,[]);
  assert.deepEqual((await runContentFormat({root})).failures,[]);
});
test('templates are excluded in both publication modes, including colocated assets',async t=>{
  const {root,write}=await fixture(t);
  await write('.docignore','content/_templates/\n');
  await write('content/_templates/v1/ko/wiki.md','TEMPLATE_ONLY_SENTINEL');
  await write('content/_templates/v1/ko/asset.txt','TEMPLATE_ONLY_SENTINEL');
  assert.equal(isDocIgnored('content/_templates/v1/ko/wiki.md',ignorePatterns(root)),true);
  for(const mode of ['public','development']){
    prepareContent(root,mode);
    const files=await fs.readdir(path.join(root,'.content-build'),{recursive:true});
    assert.ok(!files.some(f=>f.includes('_templates')));
  }
});
test('title-only locale documents migrate without copying or changing the borrowed body',async t=>{
  const {root,write}=await fixture(t);
  const relative='content/en/wiki/d/note.md';
  const target=path.join(root,relative);
  const source=path.join(root,'content/ko/wiki/d/note.md');
  const before=await fs.readFile(source,'utf8');
  await write(relative,'---\ntitle: 📄 English note\n---\n');
  assert.ok((await runContentFormat({root})).failures.some(e=>e.includes(relative)&&e.includes('CONTENT-001')));
  assert.deepEqual((await runContentFormat({root,write:true,migrate:true})).failures,[]);
  const migrated=await fs.readFile(target,'utf8');
  assert.equal(parseDocument(migrated,target).empty,true);
  assert.equal(parseDocument(migrated,target).title,'📄 English note');
  assert.equal(await fs.readFile(source,'utf8'),before);
  assert.equal(planLocaleFallbacks(root).get(target).file,source);
  assert.deepEqual((await runContentFormat({root})).failures,[]);
  for(const mode of ['public','development']){
    prepareContent(root,mode);
    const staged=parseDocument(await fs.readFile(path.join(root,'.content-build/en/wiki/d/note.md'),'utf8'),target);
    assert.equal(staged.title,'📄 English note');
    assert.equal(staged.data.profile_format,1);
    assert.match(staged.body,/English version unavailable/);
    assert.match(staged.body,/A note\./);
    assert.equal(await fs.readFile(target,'utf8'),migrated);
  }
});
test('hook safely autofixes fully staged files and validates the index, not unstaged or untracked edits',async t=>{
  const {root,write}=await fixture(t);
  const name='content/ko/wiki/d/note.md';
  const staged=(await fs.readFile(path.join(root,name),'utf8')).trimEnd();
  await write(name,staged);git(root,'add',name);
  await write('README.md','UNSTAGED work\n');await write('local-only.txt','Untracked\n');
  await fs.appendFile(path.join(root,'scripts/content-format/v1.mjs'),'\nthrow new Error("UNSTAGED formatter must not run");\n');
  let called=false;
  const result=await runPrecommit(root,{verify:async snapshot=>{
    called=true; assert.equal(await fs.readFile(path.join(snapshot,'README.md'),'utf8'),'Original\n');
    await assert.rejects(fs.access(path.join(snapshot,'local-only.txt')));
  }});
  assert.equal(called,true); assert.deepEqual(result.fixes,[name]);
  assert.equal(git(root,'show',`:${name}`),await fs.readFile(path.join(root,name),'utf8'));
  assert.equal(await fs.readFile(path.join(root,'README.md'),'utf8'),'UNSTAGED work\n');
  assert.match(await fs.readFile(path.join(root,'scripts/content-format/v1.mjs'),'utf8'),/UNSTAGED formatter/);
});
test('hook refuses partially staged autofix without changing the index or working copy',async t=>{
  const {root,write}=await fixture(t);const name='content/ko/wiki/d/note.md';
  const staged=(await fs.readFile(path.join(root,name),'utf8')).trimEnd();
  await write(name,staged);git(root,'add',name);await write(name,staged+'\nUNSTAGED\n');
  const before=git(root,'write-tree');
  await assert.rejects(runPrecommit(root,{verify:async()=>{throw new Error('must not run');}}),/Partially staged/);
  assert.equal(git(root,'write-tree'),before); assert.equal(await fs.readFile(path.join(root,name),'utf8'),staged+'\nUNSTAGED\n');
});
test('hook prevents generated/private index additions and rendering changes cannot evade the heavy gate',async t=>{
  const {root,write}=await fixture(t);await write('hidden/secret.md','SYNTHETIC_PRIVATE_SENTINEL');git(root,'add','hidden/secret.md');
  await assert.rejects(runPrecommit(root),/DS-005/);
  for(const file of ['src/pages/index.tsx','content/ko/wiki/_guide/note.md','plugins/content-templates/schemas/v1.cjs','design-system/format-v1.json','package-lock.json']) assert.equal(affectsRendering(file),true);
  assert.equal(affectsRendering('README.md'),false);
});
test('native bootstrap cannot silently use an unstaged hook driver',async t=>{
  const {root,write}=await fixture(t);
  const bootstrap=['.githooks/pre-commit','.githooks/commit-msg','scripts/validate-commit-message.mjs','design-system/commit-contract.json','scripts/design-system/precommit.mjs'];
  for(const file of bootstrap) await write(file,await fs.readFile(path.join(project,file)));
  git(root,'add',...bootstrap);
  await assertBootstrapMatchesIndex(root);
  await fs.appendFile(path.join(root,'scripts/design-system/precommit.mjs'),'\n// Unstaged driver change\n');
  await assert.rejects(assertBootstrapMatchesIndex(root),/Unstaged hook bootstrap/);
});
test('native bootstrap also pins the staged commit policy',async t=>{
  const {root,write}=await fixture(t);
  const bootstrap=['.githooks/pre-commit','.githooks/commit-msg','scripts/validate-commit-message.mjs','design-system/commit-contract.json','scripts/design-system/precommit.mjs'];
  for(const file of bootstrap) await write(file,await fs.readFile(path.join(project,file)));
  git(root,'add',...bootstrap);
  await fs.appendFile(path.join(root,'design-system/commit-contract.json'),'\n');
  await assert.rejects(assertBootstrapMatchesIndex(root),/Unstaged hook bootstrap/);
});
