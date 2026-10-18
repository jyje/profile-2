import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';

function git(root, args, options = {}) {
  return execFileSync('git', ['-C', root, ...args], {maxBuffer: 64 * 1024 * 1024, ...options});
}
const blocked = /^(?:hidden\/|data\/career\/|src\/components\/(?:Resume|ResumeSummary|SelectedCV|CareerDocuments|CareerDocumentTools)\/|plugins\/career-data\.cjs$|scripts\/export-career-pdfs\.mjs$|\.content-build\/|src\/generated\/|i18n\/en\/docusaurus-plugin-content-(?:blog|docs)\/|(?:output\/pdf|output\/career-review)\/)/;
export const affectsRendering = file => /^(?:src\/|i18n\/|content\/|plugins\/|design-system\/|scripts\/|\.docignore$|docusaurus\.config|sidebars\.|package(?:-lock)?\.json$|\.github\/workflows\/)/.test(file);

export async function assertBootstrapMatchesIndex(root) {
  // Git starts a working-tree hook. Reject accidental unstaged changes to that
  // bootstrap/driver rather than pretending they were part of the checked tree.
  for (const file of ['.githooks/pre-commit', '.githooks/commit-msg', 'scripts/validate-commit-message.mjs', 'design-system/commit-contract.json', 'scripts/design-system/precommit.mjs']) {
    let staged;
    try {staged = git(root, ['show', `:${file}`], {stdio:['ignore','pipe','pipe']});}
    catch {throw new Error(`Stage the design gate coherently before committing: missing ${file} in the index`);}
    if (!staged.equals(await fs.readFile(path.join(root,file)))) throw new Error(`Unstaged hook bootstrap change: ${file}. Review and stage it explicitly.`);
  }
}

async function productionVerify(snapshot, root, tree) {
  const env = {...process.env, SITE_CONTENT_MODE: 'public', SITE_BASE_URL: '/profile-2/',
    SITE_URL: 'https://jyje.github.io', LABS_REMOTE_ENTRY: '',
    VERIFY_BASE_PATH: '/profile-2/', VERIFY_BUILD_DIR: path.join(snapshot, 'build'),
    UX_LINT_OUTPUT: path.join(snapshot, '.playwright-mcp/ux-lint/after'),
    GIT_DIR: git(root, ['rev-parse', '--absolute-git-dir'], {encoding:'utf8'}).trim(), GIT_WORK_TREE: snapshot};
  // Git hook environments can contain a relative alternate-index path. The
  // snapshot is already frozen, and the build must not touch the active index.
  delete env.GIT_INDEX_FILE;
  delete env.VERIFY_ORIGIN;
  const run = args => {
    const result = spawnSync(process.execPath, args, {cwd:snapshot, env, stdio:'inherit'});
    if (result.status !== 0) throw new Error(`Staged snapshot gate failed: ${args.join(' ')}`);
  };
  try {
    run(['scripts/design-system/lint.mjs']);
    run(['scripts/content-format.mjs']);
    run(['scripts/build-site.mjs']);
    run(['node_modules/typescript/bin/tsc', '--noEmit']);
    run(['scripts/verify-ux-lint.mjs']);
    run(['scripts/verify-breadcrumbs.mjs']);
    run(['scripts/verify-publication.mjs']);
    console.log(`Staged tree ${tree}: design, content, public build and screenshot gates passed.`);
  } finally {
    const from = path.join(snapshot, '.playwright-mcp');
    const destination = path.join(root, '.playwright-mcp/precommit', tree);
    try {
      await fs.cp(from, destination, {recursive:true});
      await fs.writeFile(path.join(destination, 'index-source.json'), JSON.stringify({tree, source:'git-index', node:process.version},null,2));
    } catch (e) {if(e.code !== 'ENOENT') throw e;}
  }
}

export async function runPrecommit(root = process.cwd(), {verify = productionVerify} = {}) {
  if (Number(process.versions.node.split('.')[0]) < 26) throw new Error('Activate Node.js 26+ before committing (nvm use).');
  const names = git(root, ['diff','--cached','--name-only','--diff-filter=ACMR','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
  const allChanges = git(root, ['diff','--cached','--name-only','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
  if (!allChanges.length) {console.log('No staged changes.'); return;}
  if (names.some(file => blocked.test(file))) throw new Error('DS-005: generated/private artifacts must not enter the index');
  const snapshot = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-design-index-'));
  try {
    git(root, ['checkout-index','--all',`--prefix=${snapshot}/`]);
    await fs.symlink(path.join(root, 'node_modules'), path.join(snapshot, 'node_modules'), 'dir');
    const formatter = await import(pathToFileURL(path.join(snapshot, 'scripts/content-format/v1.mjs')));
    const rules = await import(pathToFileURL(path.join(snapshot, 'scripts/design-system/rules.mjs')));
    const fixes = [];
    for (const file of names) {
      const target = path.join(snapshot, file);
      const stat = await fs.lstat(target);
      if (!stat.isFile()) continue;
      if (!formatter.contentKind(file) && !/^src\/.+\.(?:css|tsx)$/.test(file)) continue;
      const staged = await fs.readFile(target, 'utf8');
      let after = staged;
      if (formatter.contentKind(file)) after = await formatter.formatContent(staged, file, {root:snapshot});
      else after = (file.endsWith('.css') ? rules.cssDesign(staged, file, {fix:true}) : rules.jsxDesign(staged, file, {fix:true})).text;
      if (after === staged) continue;
      const working = await fs.readFile(path.join(root, file), 'utf8');
      if (working !== staged) throw new Error(`Partially staged ${file}: left index/worktree unchanged. Format explicitly, review and restage intended hunks.`);
      fixes.push({file, staged, after});
    }
    // Preflight every file before writing any. Do not stash, reset, or stage an
    // unrelated path. An editor change during preflight aborts rather than wins.
    for (const fix of fixes) {
      if (await fs.readFile(path.join(root, fix.file), 'utf8') !== fix.staged) throw new Error(`Concurrent edit: ${fix.file}`);
    }
    for (const fix of fixes) {
      await fs.writeFile(path.join(root, fix.file), fix.after);
      git(root, ['add','--',fix.file]);
      await fs.writeFile(path.join(snapshot, fix.file), fix.after);
      console.log(`Safe staged autofix: ${fix.file}`);
    }
    const tree = git(root, ['write-tree'], {encoding:'utf8'}).trim();
    const content = await import(pathToFileURL(path.join(snapshot, 'scripts/content-format.mjs')));
    const design = await import(pathToFileURL(path.join(snapshot, 'scripts/design-system/lint.mjs')));
    const c = await content.runContentFormat({root:snapshot});
    const d = await design.runDesignLint(snapshot);
    if (c.failures.length || d.errors.length) throw new Error([...c.failures, ...d.errors].join('\n'));
    if (allChanges.some(affectsRendering)) await verify(snapshot, root, tree);
    // Ensure the index did not change while the browser/build gate was running.
    if (git(root, ['write-tree'], {encoding:'utf8'}).trim() !== tree) throw new Error('Index changed during validation; retry the commit.');
    return {tree, fixes:fixes.map(f => f.file)};
  } finally {await fs.rm(snapshot, {recursive:true, force:true});}
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {await assertBootstrapMatchesIndex(process.cwd()); await runPrecommit();} catch(e) {console.error(e.message); process.exitCode = 1;}
}
