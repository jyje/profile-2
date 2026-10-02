import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import {contentMode, isDocIgnored, authorFile} from '../plugins/content-visibility.cjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG = path.join(ROOT, 'data/home-curation.yml');
const OUTPUT = path.join(ROOT, 'src/generated/curation.json');

function assertId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9/_-]*$/.test(id)) {
    throw new Error('Invalid curation id: ' + String(id));
  }
}

function readItem(kind, id, locale) {
  assertId(id);
  if (kind !== 'blog' && kind !== 'wiki') {
    throw new Error('Invalid curation kind: ' + String(kind));
  }
  if (contentMode() === 'public' && isDocIgnored(authorFile(`content/${locale}/${kind}/${id}.md`))) {
    throw new Error('Development-only document cannot be curated in a public build: ' + id);
  }

  let sourceLocale = locale;
  let file = path.join(ROOT, authorFile(`content/${sourceLocale}/${kind}/${id}.md`));
  if (!fs.existsSync(file) && kind === 'wiki' && locale === 'en') {
    sourceLocale = 'ko';
    file = path.join(ROOT, authorFile(`content/${sourceLocale}/${kind}/${id}.md`));
  }
  if (!fs.existsSync(file)) {
    throw new Error('Curated document is missing: ' + file);
  }

  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error('Curated document needs frontmatter: ' + file);
  const meta = yaml.load(match[1]);
  if (!meta?.title) throw new Error('Curated document needs a title: ' + file);
  if (meta.draft === true || meta.unlisted === true) {
    throw new Error('Curated document is not public: ' + file);
  }

  const slug = kind === 'blog' ? String(meta.slug ?? id.replace(/^\d{4}-\d{2}-\d{2}-/, '')) : id;
  if (kind === 'blog' && !/^\d{4}-\d{2}-\d{2}-/.test(id)) {
    throw new Error('Blog curation id needs a date prefix: ' + id);
  }
  const route = kind === 'blog' ? '/blog/' + slug : '/wiki/' + slug;

  return {
    id,
    kind,
    title: String(meta.title),
    description: String(meta.description ?? '').replace(/<[^>]*>/g, '').split(/\s*Photo by\s*/i)[0].trim(),
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 3).map(String) : [],
    date: kind === 'blog' ? id.slice(0, 10) : null,
    sourceLocale,
    url: (sourceLocale === 'en' ? '/en' : '') + route,
  };
}

function resolveGroup(entries, kind, locale) {
  if (!Array.isArray(entries)) throw new Error('Curation group must be a list');
  return entries.map((entry) => readItem(kind ?? entry.kind, kind ? entry : entry.id, locale));
}

export function buildCuration() {
  const config = yaml.load(fs.readFileSync(CONFIG, 'utf8'));
  if (!config?.recommendations || typeof config.recommendations !== 'object') {
    throw new Error('home-curation.yml needs recommendation pools');
  }
  const output = {recommendations: {}, counts: {}};
  for (const locale of ['ko', 'en']) {
    output.recommendations[locale] = {};
    for (const kind of ['blog', 'wiki']) {
      const group = config.recommendations[kind];
      const count = group?.count;
      if (!Number.isInteger(count) || count < 1 || count > group.ids?.length) {
        throw new Error('Invalid recommendation count for ' + kind);
      }
      const ids = group.ids;
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate recommendation id in ' + kind);
      output.recommendations[locale][kind] = resolveGroup(ids, kind, locale);
      output.counts[kind] = count;
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n');
  console.log('[build-curation] indexed homepage recommendation pools');
}
