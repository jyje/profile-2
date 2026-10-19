import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {validateCommitMessage, isMergeInProgress} from './validate-commit-message.mjs';

const project = path.resolve(import.meta.dirname, '..');
const expectedPairs = [
  ['🎉', 'init'], ['🔧', 'chore'], ['🛠️', 'fix'], ['✨', 'feat'],
  ['✏️', 'typo'], ['🐛', 'bug'], ['⬆️', 'dep'], ['🔐', 'security'],
  ['🗑️', 'remove'], ['♻️', 'refactor'], ['📄', 'docs'], ['📝', 'article'],
  ['🎨', 'style'], ['⚡', 'perf'], ['✅', 'test'], ['🔨', 'build'],
  ['🚀', 'release'], ['🤖', 'ci'],
];
const env = {...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull};
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[key];

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-commit message-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  for (const name of ['.githooks/commit-msg', 'scripts/validate-commit-message.mjs', 'design-system/commit-contract.json']) {
    await fs.mkdir(path.dirname(path.join(root, name)), {recursive: true});
    await fs.copyFile(path.join(project, name), path.join(root, name));
  }
  await fs.chmod(path.join(root, '.githooks/commit-msg'), 0o755);
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Commit message fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'core.hooksPath', '.githooks');
  const commit = message => spawnSync('git', ['commit', '--allow-empty', '-m', message], {cwd: root, env, encoding: 'utf8'});
  return {root, git, commit};
}

test('versioned commit policy matches every approved Gitmoji/type pair', async () => {
  const policy = JSON.parse(await fs.readFile(path.join(project, 'design-system/commit-contract.json'), 'utf8'));
  assert.equal(policy.version, 1);
  assert.deepEqual(Object.entries(policy.gitmojiTypes), expectedPairs);
  for (const [emoji, type] of expectedPairs) {
    assert.equal(validateCommitMessage(`${emoji} ${type}(site): describe the change`).valid, true, type);
    assert.equal(validateCommitMessage(`${emoji} ${type === 'feat' ? 'fix' : 'feat'}(site): wrong type`).valid, false, type);
  }
});

test('scope and lowercase English summary are mandatory, including dependency and release commits', () => {
  for (const subject of [
    '⬆️ dep(deps): update dependencies', '🚀 release(site): publish v1',
    '✨ feat(skills/profile-design-system): improve verification',
    '📄 docs(i18n): document translations\r\n\r\nBody text.',
  ]) assert.equal(validateCommitMessage(subject).valid, true, subject);
  for (const subject of [
    '', null, 'feat(site): missing Gitmoji', '❌ chore(site): unknown emoji',
    '🚀 ci(site): wrong release type', '✨ feat: missing scope', '✨ feat(): empty scope',
    '✨ feat(Site): uppercase scope', '✨ feat(no space): invalid scope', '✨ feat(foo_bar): invalid scope',
    '✨ feat(site): Uppercase summary', '✨ feat(site): 123', '✨ feat(site): 변경',
    '✨ feat(site):', ' ✨ feat(site): leading space', '✨  feat(site): extra separator',
  ]) assert.equal(validateCommitMessage(subject).valid, false, String(subject));
});

test('merge subjects require both Git-style syntax and an actual merge context', () => {
  const subject = "Merge branch 'topic'";
  assert.equal(validateCommitMessage(subject).valid, false);
  assert.equal(validateCommitMessage(subject, {mergeInProgress: true}).valid, true);
  assert.equal(validateCommitMessage('Merge completely arbitrary text', {mergeInProgress: true}).valid, false);
});

test('native commit-msg hook accepts valid messages and preserves HEAD/index on rejection', async t => {
  const {root, git, commit} = await fixture(t);
  git('add', '.githooks', 'scripts', 'design-system');
  assert.equal(commit('✨ feat(site): install the fixture').status, 0);
  await fs.writeFile(path.join(root, 'note.txt'), 'Synthetic staged change\n');
  git('add', 'note.txt');
  const head = git('rev-parse', 'HEAD');
  const tree = git('write-tree');
  for (const subject of ['feat(site): missing Gitmoji', '🚀 ci(site): wrong type', "Merge branch 'topic'"]) {
    const result = commit(subject);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Invalid commit message/);
    assert.equal(git('rev-parse', 'HEAD'), head);
    assert.equal(git('write-tree'), tree);
  }
  assert.equal(commit('⬆️ dep(deps): update the fixture').status, 0);
});

test('native Git merge succeeds without permitting fake ordinary merge subjects', async t => {
  const {root, git, commit} = await fixture(t);
  git('add', '.githooks', 'scripts', 'design-system');
  assert.equal(commit('🎉 init(site): initialize the fixture').status, 0);
  git('switch', '-q', '-c', 'topic');
  await fs.writeFile(path.join(root, 'topic.txt'), 'Topic fixture\n');
  git('add', 'topic.txt');
  assert.equal(commit('✨ feat(site): add a topic').status, 0);
  git('switch', '-q', 'main');
  assert.equal(commit('📄 docs(site): record a change').status, 0);
  git('merge', '--no-ff', '--no-commit', 'topic');
  assert.equal(isMergeInProgress(root), true);
  git('commit', '--no-edit');
  assert.match(git('show', '-s', '--format=%s'), /^Merge branch 'topic'(?: into main)?$/);
  assert.equal(git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length, 3);
  assert.equal(isMergeInProgress(root), false);
  assert.equal(commit("Merge branch 'topic'").status, 1);
});

test('installer enables both hooks and refuses to replace another hooksPath', async t => {
  const {root, git} = await fixture(t);
  await fs.copyFile(path.join(project, '.githooks/pre-commit'), path.join(root, '.githooks/pre-commit'));
  await fs.mkdir(path.join(root, 'scripts/design-system'), {recursive: true});
  await fs.copyFile(path.join(project, 'scripts/design-system/install-hook.mjs'), path.join(root, 'scripts/design-system/install-hook.mjs'));
  const install = () => spawnSync(process.execPath, ['scripts/design-system/install-hook.mjs'], {cwd: root, env, encoding: 'utf8'});
  assert.equal(install().status, 0);
  for (const name of ['pre-commit', 'commit-msg']) assert.equal((await fs.stat(path.join(root, '.githooks', name))).mode & 0o777, 0o755);
  git('config', 'core.hooksPath', 'other-hooks');
  const result = install();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Existing hooksPath/);
  assert.equal(git('config', '--get', 'core.hooksPath'), 'other-hooks');
});

test('validator CLI reports missing/unreadable messages without modifying files', async t => {
  const {root} = await fixture(t);
  const run = args => spawnSync(process.execPath, ['scripts/validate-commit-message.mjs', ...args], {cwd: root, env, encoding: 'utf8'});
  assert.equal(run([]).status, 2);
  const missing = run(['missing-message.txt']);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Cannot validate commit message/);
});
