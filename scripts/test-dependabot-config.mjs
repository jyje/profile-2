import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import test from 'node:test';
import {load} from 'js-yaml';

const root = new URL('../', import.meta.url);
const config = load(await readFile(new URL('.github/dependabot.yaml', root), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const wildcard = pattern => new RegExp('^' + pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
const groupFor = (update, name, type, level) => Object.entries(update.groups).find(([, group]) =>
  (!group['applies-to'] || group['applies-to'] === 'version-updates') &&
  (!group['dependency-type'] || group['dependency-type'] === type) &&
  (!group['update-types'] || group['update-types'].includes(level)) &&
  group.patterns.some(pattern => wildcard(pattern).test(name)))?.[0];

test('one yaml config covers exactly the existing host and Actions ecosystems', async () => {
  await assert.rejects(access(new URL('.github/dependabot.yml', root)), {code: 'ENOENT'});
  assert.equal(config.version, 2);
  assert.deepEqual(config.updates.map(update => update['package-ecosystem']), ['npm', 'github-actions']);
  for (const update of config.updates) {
    assert.equal(update.directory, '/');
    assert.deepEqual(update.schedule, {interval: 'weekly', day: 'monday', time: '09:00', timezone: 'Asia/Seoul'});
    assert.ok(update['open-pull-requests-limit'] > 0);
    assert.deepEqual(update['commit-message'], {prefix: '🤖 ci', 'prefix-development': '🤖 ci', include: 'scope'});
    assert.deepEqual(update.labels, ['dependencies']);
    assert.equal(update.ignore, undefined);
    assert.equal(update['target-branch'], undefined, 'Security updates must retain default-branch behavior');
  }
});

test('official framework and coupled UI packages stay in coordinated groups', () => {
  const npm = config.updates.find(update => update['package-ecosystem'] === 'npm');
  for (const [section, type] of [['dependencies', 'production'], ['devDependencies', 'development']]) {
    for (const name of Object.keys(manifest[section])) {
      const group = groupFor(npm, name, type, 'patch');
      if (name.startsWith('@docusaurus/')) {
        assert.equal(group, 'docusaurus');
        assert.equal(groupFor(npm, name, type, 'major'), 'docusaurus');
      } else if (['react', 'react-dom', '@types/react'].includes(name)) {
        assert.equal(group, 'react');
      } else if (['tailwindcss', '@tailwindcss/postcss', 'tailwind-merge'].includes(name)) {
        assert.equal(group, 'tailwind');
      } else {
        assert.equal(group, `${type}-minor-patch`);
        assert.equal(groupFor(npm, name, type, 'major'), undefined);
      }
    }
  }
  assert.equal(npm['versioning-strategy'], 'increase');
});
