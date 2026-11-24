import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {summarizeAudit} from './audit-summary.mjs';
import {normalizePnpmAudit, parsePnpmLock} from './lib/pnpm-audit.mjs';

function fixture() {
  return {audit: {vulnerabilities: {
    deepmerge: {severity: 'low', via: [{url: 'https://github.com/advisories/GHSA-gcqx-w48m-w2h4', severity: 'low', title: 'SYNTHETIC_PRIVATE_MARKER'}]},
    parent: {severity: 'low', via: ['deepmerge', 'cycle']},
    cycle: {severity: 'low', via: ['parent']},
  }, error: {message: 'SYNTHETIC_PRIVATE_MARKER'}, metadata: {secret: 'SYNTHETIC_PRIVATE_MARKER'}},
  lock: {packages: Object.fromEntries(['deepmerge', 'parent', 'cycle'].map(name => [`node_modules/${name}`, {version: '4.3.1', resolved: 'SYNTHETIC_PRIVATE_MARKER'}]))}};
}

test('allowlisted reporting covers propagation cycles without leaking diagnostic markers', () => {
  const {audit, lock} = fixture(); const report = summarizeAudit(audit, lock);
  assert.equal(report.rootCount, 1); assert.equal(report.packageCount, 3);
  assert.equal(report.counts.low, 3);
  assert.ok(report.packages.every(item => item.roots.join() === 'deepmerge'));
  assert.doesNotMatch(JSON.stringify(report), /SYNTHETIC_PRIVATE_MARKER/);
  assert.equal(report.roots[0].status, 'tracked-unresolved');
});

test('malformed inputs, private URLs, unresolved cycles and unsafe versions fail closed', () => {
  for (const mutate of [
    ({audit}) => { audit.vulnerabilities.deepmerge.via[0].url = 'https://private.invalid/SYNTHETIC_PRIVATE_MARKER'; },
    ({audit}) => { audit.vulnerabilities.deepmerge.via = ['parent']; },
    ({audit}) => { audit.vulnerabilities.parent.via.push('missing'); },
    ({lock}) => { lock.packages['node_modules/deepmerge'].version = 'SYNTHETIC_PRIVATE_MARKER'; },
    ({audit}) => { audit.vulnerabilities.deepmerge.severity = 'SYNTHETIC_PRIVATE_MARKER'; },
  ]) {
    const data = fixture(); mutate(data);
    assert.throws(() => summarizeAudit(data.audit, data.lock), error => !error.message.includes('SYNTHETIC_PRIVATE_MARKER'));
  }
  assert.throws(() => summarizeAudit(null, null));
});

test('unknown roots stay unresolved and cannot inherit a tracking policy', () => {
  const {audit, lock} = fixture();
  audit.vulnerabilities = JSON.parse('{"constructor":{"severity":"low","via":[{"severity":"low","url":"https://github.com/advisories/GHSA-gcqx-w48m-w2h4"}]}}');
  lock.packages['node_modules/constructor'] = {version: '1.0.0'};
  const report = summarizeAudit(audit, lock);
  assert.equal(report.roots[0].issue, null);
  assert.equal(report.roots[0].status, 'untracked-unresolved');
});

test('CI runs the reporter and security fixtures and uploads only the allowlisted file', () => {
  const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
  assert.match(JSON.parse(read('package.json')).scripts['test:security'], /scripts\/test-audit-summary\.mjs/);
  const workflow = read('.github/workflows/ci.yaml');
  assert.match(workflow, /run: pnpm (?:run )?test:security/);
  assert.match(workflow, /run: node scripts\/audit-summary\.mjs > audit-summary\.json/);
  assert.match(workflow, /name: dependency-audit-summary\s+path: audit-summary\.json/);
  assert.doesNotMatch(workflow, /run: (?:npm|pnpm) audit/);
});

const lockText = `lockfileVersion: '9.0'
---
lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      parent:
        specifier: ^1.0.0
        version: 1.0.0

packages:

  '@scope/pkg@2.0.0':
    resolution: {integrity: sha512-SYNTHETIC_PRIVATE_MARKER}

  deepmerge@4.3.1:
    resolution: {integrity: sha512-SYNTHETIC_PRIVATE_MARKER}

  parent@1.0.0:
    resolution: {integrity: sha512-SYNTHETIC_PRIVATE_MARKER}

  parent@1.1.0:
    resolution: {integrity: sha512-SYNTHETIC_PRIVATE_MARKER}

snapshots:

  deepmerge@4.3.1(patch_hash=abc): {}

  notapackage@9.9.9: {}
`;

function pnpmReport() {
  return {advisories: {1100: {id: 1100, module_name: 'deepmerge', severity: 'low', github_advisory_id: 'GHSA-gcqx-w48m-w2h4',
    url: 'https://private.invalid/SYNTHETIC_PRIVATE_MARKER', title: 'SYNTHETIC_PRIVATE_MARKER', vulnerable_versions: '<4.3.2',
    findings: [{version: '4.3.1', paths: ['.>parent>deepmerge', 'parent>deepmerge']}]}},
  metadata: {vulnerabilities: {info: 0, low: 1, moderate: 0, high: 0, critical: 0}, dependencies: 3}};
}

test('pnpm lock parser reads only the project document packages section, one entry per version', () => {
  const lock = parsePnpmLock(lockText);
  const versions = name => Object.entries(lock.packages).filter(([key]) => key.endsWith(`/node_modules/${name}`)).map(([, v]) => v.version).sort();
  assert.deepEqual(versions('parent'), ['1.0.0', '1.1.0']);
  assert.deepEqual(versions('@scope/pkg'), ['2.0.0']);
  assert.deepEqual(versions('deepmerge'), ['4.3.1']);
  assert.deepEqual(versions('notapackage'), []);
  for (const bad of ['', 'lockfileVersion: 9\n', null, undefined]) assert.throws(() => parsePnpmLock(bad));
});

test('pnpm audit output feeds the unchanged report shape, including dependents from finding paths', () => {
  const report = summarizeAudit(normalizePnpmAudit(pnpmReport()), parsePnpmLock(lockText));
  assert.equal(report.rootCount, 1); assert.equal(report.packageCount, 2);
  assert.deepEqual(report.roots[0].advisories, ['https://github.com/advisories/GHSA-gcqx-w48m-w2h4']);
  assert.deepEqual(report.roots[0].versions, ['4.3.1']);
  assert.deepEqual(report.packages.map(item => [item.package, item.versions, item.roots]),
    [['deepmerge', ['4.3.1'], ['deepmerge']], ['parent', ['1.0.0', '1.1.0'], ['deepmerge']]]);
  assert.equal(report.roots[0].status, 'tracked-unresolved');
  assert.doesNotMatch(JSON.stringify(report), /SYNTHETIC_PRIVATE_MARKER|private\.invalid/);
});

test('a clean pnpm audit reports no roots and unusable pnpm output fails closed', () => {
  const clean = {advisories: {}, metadata: {vulnerabilities: {info: 0, low: 0, moderate: 0, high: 0, critical: 0}}};
  const report = summarizeAudit(normalizePnpmAudit(clean), parsePnpmLock(lockText));
  assert.equal(report.rootCount, 0); assert.equal(report.packageCount, 0);
  for (const bad of [null, [], {}, {error: {code: 'ERR', message: 'SYNTHETIC_PRIVATE_MARKER'}}, {advisories: [], metadata: {vulnerabilities: {}}},
    {advisories: {}}, {advisories: {1: null}, metadata: {vulnerabilities: {}}},
    {advisories: {1: {module_name: 'deepmerge'}}, metadata: {vulnerabilities: {}}}]) {
    assert.throws(() => normalizePnpmAudit(bad), error => !error.message.includes('SYNTHETIC_PRIVATE_MARKER'));
  }
  const data = pnpmReport(); data.advisories[1100].github_advisory_id = 'x'; data.advisories[1100].url = 'https://private.invalid/SYNTHETIC_PRIVATE_MARKER';
  assert.throws(() => summarizeAudit(normalizePnpmAudit(data), parsePnpmLock(lockText)), error => !error.message.includes('SYNTHETIC_PRIVATE_MARKER'));
  const uncovered = pnpmReport(); uncovered.advisories[1100].module_name = 'missing';
  assert.throws(() => summarizeAudit(normalizePnpmAudit(uncovered), parsePnpmLock(lockText)));
});

test('the CLI exits non-zero without a report when pnpm audit cannot run or returns garbage', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-summary-'));
  const bin = path.join(dir, 'bin'); const script = new URL('./audit-summary.mjs', import.meta.url).pathname;
  writeFileSync(path.join(dir, 'pnpm-lock.yaml'), lockText);
  for (const body of ['echo "SYNTHETIC_PRIVATE_MARKER not json"; exit 0', 'echo "{}"; exit 1', 'exit 2']) {
    spawnSync('mkdir', ['-p', bin]); writeFileSync(path.join(bin, 'pnpm'), `#!/bin/sh\n${body}\n`, {mode: 0o755});
    const result = spawnSync(process.execPath, [script], {cwd: dir, encoding: 'utf8', env: {...process.env, PATH: `${bin}:${process.env.PATH}`}});
    assert.notEqual(result.status, 0); assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /SYNTHETIC_PRIVATE_MARKER/); assert.match(result.stderr, /Sanitized audit reporting failed/);
  }
  const missing = spawnSync(process.execPath, [script], {cwd: dir, encoding: 'utf8', env: {...process.env, PATH: dir}});
  assert.notEqual(missing.status, 0); assert.equal(missing.stdout, '');
});
