import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
const read = name => yaml.load(fs.readFileSync(new URL(`../data/${name}.yml`, import.meta.url), 'utf8'));
const layout = read('career-layout');
test('shared selection indices identify equivalent bilingual records', () => {
  const ko = read('resume.ko'); const en = read('resume.en');
  for (const kind of ['work', 'projects', 'education']) {
    for (const selection of layout[kind]) {
      const index = typeof selection === 'number' ? selection : selection.index;
      assert.equal(ko[kind][index].startDate, en[kind][index].startDate, `${kind} ${index} start date differs`);
      assert.deepEqual(ko[kind][index].endDate, en[kind][index].endDate, `${kind} ${index} end date differs`);
    }
  }
  for (const index of layout.certificates) assert.equal(ko.certificates[index].website, en.certificates[index].website);
  for (const index of layout.languages) assert.equal(ko.languages[index].language, en.languages[index].language);
  for (const selection of layout.skills) assert.equal(ko.skills[selection.index].name, en.skills[selection.index].name);
});
for (const locale of ['ko', 'en']) {
  test(`${locale} one-page curation uses existing source items without truncation`, () => {
    const data = read(`resume.${locale}`);
    assert.ok(layout.summary[locale]);
    for (const kind of ['work', 'projects', 'skills']) {
      const seen = new Set();
      for (const selection of layout[kind]) {
        assert.ok(!seen.has(selection.index), `duplicate ${kind} ${selection.index}`); seen.add(selection.index);
        const item = data[kind][selection.index];
        assert.ok(item, `missing ${kind} ${selection.index}`);
        const items = kind === 'skills' ? item.keywords : kind === 'work' ? item.roles.items : item.results.items;
        for (const index of selection.items ?? selection.keywords) assert.ok(items[index], `missing ${kind} ${selection.index}/${index}`);
      }
    }
    for (const kind of ['education', 'certificates', 'languages']) {
      for (const index of layout[kind]) assert.ok(data[kind][index], `missing ${kind} ${index}`);
    }
  });
}
