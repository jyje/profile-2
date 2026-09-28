import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import path from 'node:path';
import os from 'node:os';
import {loadCareer} from '../plugins/career-data.cjs';
import {validateCareerLayout} from './validate-career-layout.mjs';
const {layout, sources} = loadCareer(path.resolve('.'));
test('all role selections refer to equivalent bilingual facts', () => {
  validateCareerLayout(layout, sources);
  assert.deepEqual(Object.keys(layout.profiles), ['platform', 'agents', 'inference']);
  assert.equal(layout.defaultRole, 'platform');
});
for (const [name, mutate] of [
  ['unknown default', config => {config.defaultRole = 'unknown';}],
  ['missing source', config => {config.profiles.agents.resume.projects[0].index = 99;}],
  ['missing detail', config => {config.profiles.platform.resume.work[0].items = [{index: 99, text: 'summary'}];}],
  ['duplicate source', config => {config.profiles.inference.selectedCv.projects = [2, 2];}],
  ['negative index', config => {config.profiles.platform.selectedCv.work = [-1];}],
  ['missing translation', config => {config.profiles.agents.summary.en = '';}],
  ['incomplete selected CV', config => {config.profiles.platform.selectedCv.projects = [];}],
]) test(`curation rejects ${name}`, () => {
  const config = structuredClone(layout); mutate(config);
  assert.throws(() => validateCareerLayout(config, sources));
});
test('curation rejects locale drift', () => {
  const changed = structuredClone(sources);
  changed.en.work.reverse();
  assert.throws(() => validateCareerLayout(layout, changed), /locale mismatch/);
});

function fixture(change, check) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'career-records-'));
  fs.cpSync('data/career', path.join(root, 'data/career'), {recursive: true});
  const edit = (file, update) => {
    const target = path.join(root, 'data/career', `${file}.yaml`);
    const record = yaml.load(fs.readFileSync(target, 'utf8'));
    update(record); fs.writeFileSync(target, yaml.dump(record));
  };
  try { change(edit); check(() => loadCareer(root)); } finally { fs.rmSync(root, {recursive: true, force: true}); }
}
test('stable IDs and CV anchors survive catalog reordering', () => {
  fixture(edit => edit('index', record => {record.projects.reverse(); record.work.reverse();}), load => {
    const changed = load();
    for (const role of Object.keys(layout.profiles)) {
      assert.deepEqual(changed.layout.profiles[role].resume.projects.map(item => changed.sources.ko.projects[item.index].id), layout.profiles[role].resume.projects.map(item => sources.ko.projects[item.index].id));
    }
    assert.equal(changed.sources.ko.projects.find(item => item.id === 'on-prem-mlops').anchor, 'projects-2');
    validateCareerLayout(changed.layout, changed.sources);
  });
});
for (const [name, change] of [
  ['unknown detail ID', edit => edit('profiles/platform', p => {p.resume.projects[0].outcomes[0].id = 'missing';})],
  ['unknown display field', edit => edit('profiles/platform', p => {p.resume.projects[0].outcomes[0].text = 'invented';})],
  ['duplicate record ID', edit => edit('skills', p => {p[1].id = p[0].id;})],
  ['duplicate stable anchor', edit => edit('skills', p => {p[1].anchor = p[0].anchor;})],
  ['missing catalog entry', edit => edit('index', p => {p.projects.pop();})],
  ['mismatched bilingual detail IDs', edit => edit('projects/on-prem-mlops', p => {p.en.outcomes[0].id = 'different';})],
  ['invalid contribution percentage', edit => edit('projects/on-prem-mlops', p => {p.contribution = 120;})],
]) test(`source assembly rejects ${name}`, () => fixture(change, load => assert.throws(load)));
test('summary and detail retain one fact ID, with a defined detail fallback', () => {
  fixture(edit => edit('projects/on-prem-mlops', p => {
    p.ko.outcomes[0].summary = 'Short expression'; p.ko.outcomes[0].detail = 'Detailed expression';
    delete p.ko.outcomes[1].detail;
  }), load => {
    const items = load().sources.ko.projects.find(item => item.id === 'on-prem-mlops').results.items;
    assert.equal(items[0].summary, 'Short expression'); assert.equal(items[0].content, 'Detailed expression');
    assert.equal(items[1].content, items[1].summary);
  });
});
