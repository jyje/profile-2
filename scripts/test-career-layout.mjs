import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
const read = name => yaml.load(fs.readFileSync(new URL(`../data/${name}.yml`, import.meta.url), 'utf8'));
const layout = read('career-layout');
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
