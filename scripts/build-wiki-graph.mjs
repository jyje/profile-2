// Fills missing English wiki pages with their Korean original and a browser-
// translation notice before Docusaurus loads its localized docs plugin.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KO_ROOT = path.join(ROOT, 'content/ko/wiki');
const EN_BUILD_ROOT = path.join(ROOT, 'i18n/en/docusaurus-plugin-content-docs/current');
const FALLBACK_CALLOUT = [
  '> [!note] English version unavailable',
  '> This article is currently available only in Korean. Use your browser’s built-in translation feature to read it in English.',
  '',
  '',
].join('\n');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function splitFrontmatter(source) {
  const match = source.match(/^(---\s*\r?\n[\s\S]*?\r?\n---\s*)(?:\r?\n|$)/);
  if (!match) return {raw: '', data: {}, body: source};
  const raw = match[1];
  return {
    raw,
    data: {},
    body: source.slice(match[0].length),
  };
}

export function mergeKoreanFallbackDocs() {
  for (const source of walk(KO_ROOT)) {
    const relative = path.relative(KO_ROOT, source);
    const destination = path.join(EN_BUILD_ROOT, relative);
    if (fs.existsSync(destination)) continue;

    fs.mkdirSync(path.dirname(destination), {recursive: true});
    if (source.endsWith('.md')) {
      const {raw, body} = splitFrontmatter(fs.readFileSync(source, 'utf8'));
      const markdown = raw ? `${raw}\n\n${FALLBACK_CALLOUT}${body}` : `${FALLBACK_CALLOUT}${fs.readFileSync(source, 'utf8')}`;
      fs.writeFileSync(destination, markdown);
    } else {
      fs.copyFileSync(source, destination);
    }
  }
}
