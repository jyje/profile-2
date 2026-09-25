// Mirrors the authoring layout (content/{ko,en}/...) into what Docusaurus expects:
//   content/en/blog -> i18n/en/docusaurus-plugin-content-blog
//   content/en/wiki -> i18n/en/docusaurus-plugin-content-docs/current
// and turns data/*.yml into src/generated/*.json for React pages.
// Usage: node scripts/sync-content.mjs [--watch]
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import {buildCuration} from './build-curation.mjs';
import {mergeKoreanFallbackDocs} from './build-wiki-graph.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MIRRORS = [
  ['content/en/blog', 'i18n/en/docusaurus-plugin-content-blog'],
  ['content/en/wiki', 'i18n/en/docusaurus-plugin-content-docs/current'],
];
const skip = (p) => !path.basename(p).startsWith('.');

function mirror() {
  for (const [from, to] of MIRRORS) {
    const src = path.join(ROOT, from);
    const dest = path.join(ROOT, to);
    fs.rmSync(dest, {recursive: true, force: true});
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    fs.cpSync(src, dest, {recursive: true, filter: skip});
  }
  mergeKoreanFallbackDocs();
}

function convertData() {
  const dataDir = path.join(ROOT, 'data');
  const outDir = path.join(ROOT, 'src/generated');
  if (!fs.existsSync(dataDir)) return;
  fs.mkdirSync(outDir, {recursive: true});
  for (const f of fs.readdirSync(dataDir).filter((f) => f.endsWith('.yml'))) {
    const json = yaml.load(fs.readFileSync(path.join(dataDir, f), 'utf8'));
    fs.writeFileSync(path.join(outDir, f.replace(/\.yml$/, '.json')), JSON.stringify(json));
  }
}

function syncTagDefinitions() {
  const sourcePath = path.join(ROOT, 'data/tags.yml');
  const {tags = {}} = yaml.load(fs.readFileSync(sourcePath, 'utf8')) ?? {};
  for (const locale of ['ko', 'en']) {
    const output = Object.fromEntries(Object.entries(tags).map(([slug, tag]) => {
      const definition = {
        label: tag.label?.[locale] ?? slug,
        permalink: `/${slug}`,
      };
      const description = tag.description?.[locale];
      if (description) definition.description = description;
      return [slug, definition];
    }));
    const serialized = yaml.dump(output, {lineWidth: 120, noRefs: true, sortKeys: false});
    for (const kind of ['blog', 'wiki']) {
      const destination = path.join(ROOT, `content/${locale}/${kind}/tags.yml`);
      if (fs.existsSync(destination) && fs.readFileSync(destination, 'utf8') === serialized) continue;
      fs.writeFileSync(destination, serialized);
    }
  }
}

function syncAll() {
  syncTagDefinitions();
  mirror();
  convertData();
  buildCuration();
}

syncAll();
console.log('[sync-content] synced');

if (process.argv.includes('--watch')) {
  let timer;
  const watched = new Set();
  const onChange = (_evt, name) => {
    if (name && name.split(path.sep).some((s) => s.startsWith('.'))) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll();
      refreshWatchers();
      console.log('[sync-content] resynced');
    }, 150);
  };

  function walk(dir, paths) {
    paths.add(dir);
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (!skip(entry.name)) continue;
      const entryPath = path.join(dir, entry.name);
      paths.add(entryPath);
      if (entry.isDirectory()) walk(entryPath, paths);
    }
  }

  function refreshWatchers() {
    const paths = new Set();
    for (const dir of ['content/ko', 'content/en', 'data']) {
      const source = path.join(ROOT, dir);
      if (fs.existsSync(source)) walk(source, paths);
    }
    for (const p of watched) {
      if (!paths.has(p)) {
        fs.unwatchFile(p);
        watched.delete(p);
      }
    }
    for (const p of paths) {
      if (watched.has(p)) continue;
      fs.watchFile(p, {interval: 500}, onChange);
      watched.add(p);
    }
  }

  refreshWatchers();
  console.log('[sync-content] polling content and data');
}
