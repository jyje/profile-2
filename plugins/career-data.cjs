// Authoring records are stable IDs; generated arrays remain a rendering detail.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const SECTIONS = ['work', 'projects', 'education', 'skills', 'certificates', 'languages', 'volunteer', 'publications'];
const ID = /^[a-z][a-z0-9-]*$/;
const MODES = ['summary', 'detail'];
function localized(record, locale) {
  const {ko, en, ...shared} = record;
  assert.ok(ko && en, `Missing bilingual content for ${record.id ?? 'basics'}`);
  return {...shared, ...record[locale]};
}
function details(items, label) {
  if (!items) return undefined;
  assert.ok(Array.isArray(items), `${label}: expected a list`);
  const seen = new Set();
  return items.map(item => {
    assert.match(item.id, ID, `${label}: invalid detail ID`);
    assert.ok(!seen.has(item.id), `${label}: duplicate ${item.id}`); seen.add(item.id);
    assert.ok(typeof item.summary === 'string' && item.summary.trim(), `${label}/${item.id}: missing summary`);
    if (item.detail !== undefined) assert.ok(typeof item.detail === 'string' && item.detail.trim(), `${label}/${item.id}: empty detail`);
    return {id: item.id, ...(item.title ? {header: item.title} : {}), content: item.detail ?? item.summary, summary: item.summary, ...(item.detail ? {detail: item.detail} : {})};
  });
}
function normalize(record, kind, locale) {
  const value = localized(record, locale);
  if (!['work', 'projects'].includes(kind)) {
    const {period, ...record} = value;
    return period ? {...record, startDate: period.start, endDate: period.end ?? {}} : record;
  }
  const {period, title, role, organization, contribution, responsibilities, outcomes, ...rest} = value;
  const result = {...rest};
  if (period) {
    assert.match(period.start, /^\d{4}-\d{2}-\d{2}$/, `${record.id}: invalid start`);
    if (period.end != null) assert.match(period.end, /^\d{4}-\d{2}-\d{2}$/, `${record.id}: invalid end`);
    result.startDate = period.start; result.endDate = period.end ?? {};
  }
  if (contribution !== undefined) assert.ok(Number.isFinite(contribution) && contribution >= 0 && contribution <= 100, `${record.id}: invalid contribution`);
  if (kind === 'work' || kind === 'projects') {
    assert.ok(title?.trim() && role?.trim(), `${record.id}/${locale}: missing title or role`);
    result[kind === 'work' ? 'company' : 'position'] = title;
    if (kind === 'work') result.position = role;
    else result.company = organization;
    const description = kind === 'projects' ? role + (contribution === undefined ? '' : locale === 'ko' ? ` [기여도 ${contribution}%]` : ` [${contribution}% contribution]`) : value.description;
    const items = details(responsibilities, `${record.id}/${locale}/responsibilities`);
    if (description || items) result.roles = {...(description ? {description} : {}), ...(items ? {items} : {})};
    const results = details(outcomes, `${record.id}/${locale}/outcomes`);
    if (results) result.results = {items: results};
  } else if (title !== undefined) result.title = title;
  return result;
}
function compileProfile(profile, sources, label) {
  const index = (kind, id) => {
    const found = sources.ko[kind].findIndex(entry => entry.id === id);
    assert.ok(found >= 0, `${label}: unknown ${kind}/${id}`); return found;
  };
  const mode = value => {assert.ok(MODES.includes(value), `${label}: unknown text field ${value}`); return value;};
  const result = {title: profile.title, summary: profile.summary, resume: {}, selectedCv: {projectText: {}, workText: {}}};
  for (const [kind, selections] of Object.entries(profile.resume)) {
    result.resume[kind] = selections.map(selection => {
      if (typeof selection === 'string') return index(kind, selection);
      const i = index(kind, selection.id); const record = sources.ko[kind][i];
      if (kind === 'skills') return {index: i, keywords: selection.keywords.map(keyword => {
        const found = record.keywords.indexOf(keyword); assert.ok(found >= 0, `${label}: unknown keyword ${keyword}`); return found;
      })};
      const entries = kind === 'work' ? record.roles.items : record.results.items;
      const selected = selection[kind === 'work' ? 'responsibilities' : 'outcomes'];
      return {index: i, items: selected.map(reference => {
        const found = entries.findIndex(item => item.id === reference.id);
        assert.ok(found >= 0, `${label}: unknown detail ${selection.id}/${reference.id}`);
        return {index: found, text: mode(reference.text)};
      })};
    });
  }
  for (const [kind, selections] of Object.entries(profile.selectedCv)) {
    result.selectedCv[kind] = selections.map(selection => {
      const i = index(kind, typeof selection === 'string' ? selection : selection.id);
      if (kind === 'projects' || kind === 'work') result.selectedCv[kind === 'projects' ? 'projectText' : 'workText'][i] = mode(selection.text);
      return i;
    });
  }
  return result;
}
function loadCareer(siteDir) {
  const root = path.join(siteDir, 'data/career');
  const read = name => yaml.load(fs.readFileSync(path.join(root, `${name}.yaml`), 'utf8'));
  const catalog = read('index');
  const records = {};
  const allIds = new Set(); const anchors = new Set();
  for (const kind of SECTIONS) {
    records[kind] = ['work', 'projects'].includes(kind) ? catalog[kind].map(id => {
      assert.match(id, ID, `Invalid ${kind} filename`); const record = read(`${kind}/${id}`);
      assert.equal(record.id, id, `${kind}: filename and ID differ`); return record;
    }) : read(kind === 'volunteer' ? 'activities' : kind);
    // A forgotten file must not silently disappear from Full CV.
    if (['work', 'projects'].includes(kind)) assert.deepEqual(fs.readdirSync(path.join(root, kind)).filter(name => name.endsWith('.yaml')).sort(), catalog[kind].map(id => `${id}.yaml`).sort(), `${kind}: catalog must list every record exactly once`);
    for (const record of records[kind]) {
      assert.match(record.id, ID, `Invalid ${kind} ID`);
      assert.ok(!allIds.has(record.id), `Duplicate career ID ${record.id}`); allIds.add(record.id);
      if (['work', 'projects', 'education', 'skills'].includes(kind)) {
        assert.match(record.anchor, /^[a-z]+-[a-z0-9-]+$/, `${record.id}: missing stable anchor`);
        assert.ok(!anchors.has(record.anchor), `Duplicate anchor ${record.anchor}`); anchors.add(record.anchor);
      }
      if (['work', 'projects'].includes(kind)) for (const list of ['responsibilities', 'outcomes']) {
        assert.deepEqual((record.ko?.[list] ?? []).map(item => item.id), (record.en?.[list] ?? []).map(item => item.id), `${record.id}/${list}: bilingual IDs differ`);
      }
    }
  }
  const sources = {};
  const basics = read('basics'); const additional = read('additional');
  for (const locale of ['ko', 'en']) {
    sources[locale] = {basics: localized(basics, locale), ...additional[locale]};
    for (const kind of SECTIONS) sources[locale][kind] = records[kind].map(record => normalize(record, kind, locale));
  }
  const profiles = {};
  for (const role of catalog.profiles) {assert.match(role, ID); assert.ok(!Object.hasOwn(profiles, role), `Duplicate role ${role}`); profiles[role] = compileProfile(read(`profiles/${role}`), sources, role);}
  assert.deepEqual(fs.readdirSync(path.join(root, 'profiles')).filter(name => name.endsWith('.yaml')).sort(), catalog.profiles.map(id => `${id}.yaml`).sort(), 'Profile catalog mismatch');
  return {sources, layout: {defaultRole: catalog.defaultRole, profiles}};
}
module.exports = {loadCareer};
