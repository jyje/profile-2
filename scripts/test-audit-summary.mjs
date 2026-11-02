import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeAudit} from './audit-summary.mjs';

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
  assert.match(workflow, /run: npm run test:security/);
  assert.match(workflow, /run: node scripts\/audit-summary\.mjs > audit-summary\.json/);
  assert.match(workflow, /name: dependency-audit-summary\s+path: audit-summary\.json/);
  assert.doesNotMatch(workflow, /run: npm audit/);
});
