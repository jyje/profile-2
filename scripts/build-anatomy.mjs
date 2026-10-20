import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {writeThumbnail} from './anatomy-thumbnail.mjs';

// figures/<name>/build.mjs is the source of an Anatomy figure. This writes both themes and the thumbnail:
//   static/img/figures/<name>/index.html, static/img/figures/<name>/light/index.html, static/img/figures/<name>/thumbnail.png
// A document shows it with an `anatomy` block whose body is /img/figures/<name>.
const root = path.resolve(import.meta.dirname, '..');
const name = process.argv[2];
if (!name || !fs.existsSync(path.join(root, 'figures', name, 'build.mjs'))) {
  console.error(`Usage: npm run build:anatomy -- <name>   (needs figures/<name>/build.mjs)`);
  process.exit(1);
}
const script = path.join(root, 'figures', name, 'build.mjs');
for (const [flags, directory] of [[[], name], [['--light'], `${name}/light`]]) {
  const run = spawnSync(process.execPath, [script, ...flags, '--out', path.join(root, 'static/img/figures', directory)], {stdio: 'inherit'});
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log(`wrote ${await writeThumbnail(root, name)}`);
