import assert from 'node:assert/strict';

const list = (indices, source, label) => {
  assert.ok(Array.isArray(indices), `${label}: expected an explicit selection`);
  assert.equal(new Set(indices).size, indices.length, `${label}: duplicate selection`);
  for (const index of indices) assert.ok(Number.isInteger(index) && index >= 0 && source?.[index], `${label}: missing source ${index}`);
};
export function validateCareerLayout(config, sources) {
  assert.ok(Object.hasOwn(config.profiles, config.defaultRole), 'Unknown default role');
  const [ko, en] = [sources.ko, sources.en];
  for (const kind of ['work', 'projects', 'education', 'skills', 'certificates', 'languages', 'volunteer']) {
    assert.equal(ko[kind].length, en[kind].length, `${kind}: locale counts differ`);
    ko[kind].forEach((entry, index) => {
      const other = en[kind][index];
      const fields = ['work', 'projects', 'education'].includes(kind) ? ['startDate', 'endDate']
        : kind === 'skills' ? ['name'] : kind === 'languages' ? ['language'] : ['website'];
      for (const field of fields) assert.deepEqual(entry[field], other[field], `${kind}/${index}/${field}: locale mismatch`);
      for (const field of ['roles', 'results']) assert.equal(entry[field]?.items?.length, other[field]?.items?.length, `${kind}/${index}/${field}: locale item counts differ`);
      if (kind === 'skills') assert.deepEqual(entry.keywords, other.keywords, `${kind}/${index}: locale keywords differ`);
    });
  }
  for (const [role, profile] of Object.entries(config.profiles)) {
    assert.match(role, /^[a-z][a-z0-9-]*$/, 'Invalid role URL key');
    assert.ok(profile.title?.trim(), `${role}: missing title`);
    for (const [locale, data] of Object.entries(sources)) {
      assert.ok(profile.summary[locale]?.trim(), `${role}/${locale}: missing summary`);
      const resume = profile.resume;
      for (const kind of ['work', 'projects', 'skills']) {
        list(resume[kind].map(item => item.index), data[kind], `${role}/${locale}/resume/${kind}`);
        for (const selection of resume[kind]) {
          const source = data[kind][selection.index];
          list(kind === 'skills' ? selection.keywords : selection.items.map(item => item.index),
            kind === 'skills' ? source.keywords : kind === 'work' ? source.roles?.items : source.results?.items,
            `${role}/${locale}/resume/${kind}/${selection.index}`);
        }
      }
      for (const kind of ['education', 'certificates', 'languages']) list(resume[kind], data[kind], `${role}/${locale}/resume/${kind}`);
      for (const kind of ['work', 'projects', 'skills', 'education', 'certificates', 'languages', 'volunteer']) {
        list(profile.selectedCv[kind], data[kind], `${role}/${locale}/selectedCv/${kind}`);
        for (const item of resume[kind] ?? []) {
          const index = typeof item === 'number' ? item : item.index;
          assert.ok(profile.selectedCv[kind].includes(index), `${role}: selected CV must include resume ${kind}/${index}`);
        }
      }
    }
  }
}
