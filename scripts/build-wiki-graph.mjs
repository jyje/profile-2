// Copies Korean wiki assets that have no English counterpart before Docusaurus
// loads its localized docs plugin. Documents never fall back here: every one has
// an authored English file, and title-only files are filled in prepare-content.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KO_ROOT = path.join(ROOT, 'content/ko/wiki');
const EN_BUILD_ROOT = path.join(ROOT, 'i18n/en/docusaurus-plugin-content-docs/current');

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

export function mergeKoreanFallbackDocs(koRoot = KO_ROOT, enBuildRoot = EN_BUILD_ROOT) {
  for (const source of walk(koRoot)) {
    const relative = path.relative(koRoot, source);
    const destination = path.join(enBuildRoot, relative);
    if (fs.existsSync(destination)) continue;
    if (/\.mdx?$/.test(destination)) {
      const otherExtension = destination.endsWith('.mdx') ? destination.slice(0, -1) : `${destination}x`;
      if (fs.existsSync(otherExtension)) continue;
      throw new Error(`Missing English document with an English title: ${relative}`);
    }
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(source, destination);
  }
}
