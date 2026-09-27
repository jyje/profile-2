import fs from 'node:fs';
import path from 'node:path';

export function authoredWatchPaths(root) {
  const paths = new Set([path.join(root, '.docignore')]);
  function walk(dir, sourceRoot) {
    paths.add(dir);
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const absolute = path.join(dir, entry.name);
      if (!shouldRebuild('content', path.relative(sourceRoot, absolute))) continue;
      paths.add(absolute);
      if (entry.isDirectory()) walk(absolute, sourceRoot);
    }
  }
  for (const name of ['content/ko', 'content/en', 'data']) {
    const source = path.join(root, name);
    if (fs.existsSync(source)) walk(source, source);
  }
  return paths;
}

export function shouldRebuild(name, filename) {
  if (!filename) return false;
  const relative = String(filename).replaceAll('\\', '/');
  if (relative === '.docignore') return true;
  if (relative.split('/').some(segment => segment.startsWith('.'))) return false;
  if (name === 'src' && relative.startsWith('generated/')) return false;
  if (name === 'i18n' && /^en\/docusaurus-plugin-content-(blog|docs)(\/|$)/.test(relative)) return false;
  return true;
}
