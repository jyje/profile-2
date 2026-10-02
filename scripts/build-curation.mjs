import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import {ignorePatterns, isDocIgnored} from '../plugins/content-visibility.cjs';
import {createLastUpdateReader} from './content-last-update.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG = path.join(ROOT, 'data/home-curation.yml');
const OUTPUT = path.join(ROOT, 'src/generated/curation.json');
const readLastUpdate = createLastUpdateReader(ROOT);
const ignoredContent = ignorePatterns(ROOT);

function normalizeDate(value) {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  if (typeof value === 'string' && value) return value;
  return null;
}

function markdownFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink() || entry.name.startsWith('.')) return [];
    if (entry.isDirectory()) return markdownFiles(absolute);
    if (!/\.mdx?$/.test(entry.name)) return [];
    const relative = path.relative(ROOT, absolute).replaceAll('\\', '/');
    return isDocIgnored(relative, ignoredContent) ? [] : [absolute];
  });
}

function itemId(kind, sourceLocale, file) {
  const directory = path.join(ROOT, 'content', sourceLocale, kind);
  const relative = path.relative(directory, file).replaceAll('\\', '/').replace(/\.mdx?$/, '');
  const docId = relative.replace(/(^|\/)index$/, '');
  return `${kind}:${sourceLocale}:${docId || 'index'}`;
}

function readItem(kind, sourceLocale, file) {
  const relative = path.relative(path.join(ROOT, 'content', sourceLocale, kind), file)
    .replaceAll('\\', '/').replace(/\.mdx?$/, '');
  const docId = relative.replace(/(^|\/)index$/, '');
  const id = itemId(kind, sourceLocale, file);
  if (kind === 'blog' && !/^\d{4}-\d{2}-\d{2}-.+/.test(path.basename(relative))) {
    throw new Error('Blog curation file needs a date-prefixed filename: ' + file);
  }

  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const meta = match ? yaml.load(match[1]) ?? {} : {};
  if (meta.draft === true || meta.unlisted === true) return null;
  const body = match ? text.slice(match[0].length) : text;
  const title = meta.title ?? body.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1] ?? path.basename(relative);

  const slug = kind === 'blog'
    ? String(meta.slug ?? path.basename(relative).replace(/^\d{4}-\d{2}-\d{2}-/, ''))
    : String(meta.slug ?? `/${docId}`);
  const route = kind === 'blog'
    ? '/blog/' + slug.replace(/^\//, '')
    : '/wiki' + (slug.startsWith('/') ? slug : `/${slug}`);
  return {
    id,
    kind,
    title: String(title),
    description: String(meta.description ?? '').replace(/<[^>]*>/g, '').split(/\s*Photo by\s*/i)[0].trim(),
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 3).map(String) : [],
    date: kind === 'blog' ? path.basename(relative).slice(0, 10) : null,
    lastUpdatedAt: normalizeDate(meta.last_update?.date) ?? readLastUpdate(file) ?? null,
    sourceLocale,
    url: (sourceLocale === 'en' ? '/en' : '') + route,
  };
}

function discoverItems(kind, locale) {
  const localizedRoot = path.join(ROOT, 'content', locale, kind);
  const sourceRoot = path.join(ROOT, 'content', locale === 'en' ? 'ko' : locale, kind);
  const localized = markdownFiles(localizedRoot).map((file) => readItem(kind, locale, file)).filter(Boolean);
  if (locale !== 'en' || kind !== 'wiki') return localized;

  const ids = new Set(localized.map((item) => item.id.replace(':ko:', ':en:')));
  const fallback = markdownFiles(sourceRoot)
    .map((file) => readItem(kind, 'ko', file))
    .filter(Boolean)
    .filter((item) => !ids.has(item.id.replace(':ko:', ':en:')));
  return [...localized, ...fallback];
}

export function buildCuration() {
  const config = yaml.load(fs.readFileSync(CONFIG, 'utf8'));
  if (!config?.recommendations || !['dailyRandom', 'latestBlog', 'latestUpdated'].every((key) => Number.isInteger(config.recommendations[key]))) {
    throw new Error('home-curation.yml needs dailyRandom, latestBlog, and latestUpdated counts');
  }
  const output = {recommendations: {}, counts: config.recommendations};
  for (const locale of ['ko', 'en']) {
    const blog = discoverItems('blog', locale).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    const wiki = discoverItems('wiki', locale).sort((a, b) => (b.lastUpdatedAt ?? '').localeCompare(a.lastUpdatedAt ?? ''));
    const requiredCount = output.counts.dailyRandom + output.counts.latestBlog + output.counts.latestUpdated;
    if (blog.length < output.counts.latestBlog || (blog.length + wiki.length) < requiredCount) {
      throw new Error(`Not enough published content for ${locale} homepage recommendations`);
    }
    output.recommendations[locale] = {blog, wiki};
  }

  fs.mkdirSync(path.dirname(OUTPUT), {recursive: true});
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n');
  console.log('[build-curation] indexed homepage recommendation pools');
}
