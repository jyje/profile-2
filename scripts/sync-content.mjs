// Mirrors the authoring layout (content/{ko,en}/...) into what Docusaurus expects:
//   content/en/blog -> i18n/en/docusaurus-plugin-content-blog
//   content/en/wiki -> i18n/en/docusaurus-plugin-content-docs/current
// and turns data/*.yml into src/generated/*.json for React pages.
// Usage: node scripts/sync-content.mjs [--watch]
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

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

function syncAll() {
  mirror();
  convertData();
}

syncAll();
console.log('[sync-content] synced');

if (process.argv.includes('--watch')) {
  let timer;
  const onChange = (_evt, name) => {
    if (name && name.split(path.sep).some((s) => s.startsWith('.'))) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll();
      console.log('[sync-content] resynced');
    }, 150);
  };
  for (const dir of ['content/en', 'data']) {
    const p = path.join(ROOT, dir);
    if (fs.existsSync(p)) fs.watch(p, {recursive: true}, onChange);
  }
  console.log('[sync-content] watching content/en and data');
}
