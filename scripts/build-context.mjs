import fs from 'node:fs';
import path from 'node:path';

// CSS asset URLs can survive a baseUrl change in the bundler's persistent cache.
// Invalidate generated inputs/cache, never published output or authored content.
export function prepareBuildContext(root, signature) {
  const marker = path.join(root, '.cache-loader/profile2-build-context.json');
  const serialized = JSON.stringify(signature);
  if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8') === serialized) return false;
  for (const relative of ['.docusaurus', 'node_modules/.cache']) {
    fs.rmSync(path.join(root, relative), {recursive: true, force: true});
  }
  fs.mkdirSync(path.dirname(marker), {recursive: true});
  fs.writeFileSync(marker, serialized);
  return true;
}
