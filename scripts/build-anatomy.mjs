import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {writeThumbnail} from './anatomy-thumbnail.mjs';

// figures/<name>/build.mjs is the source of an Anatomy figure. This writes both themes and the thumbnail:
//   static/anatomy/<name>/index.html, static/anatomy/<name>-light/index.html, static/anatomy/<name>/thumbnail.png
const root = path.resolve(import.meta.dirname, '..');
const name = process.argv[2];
if (!name || !fs.existsSync(path.join(root, 'figures', name, 'build.mjs'))) {
  console.error(`Usage: npm run build:anatomy -- <name>   (needs figures/<name>/build.mjs)`);
  process.exit(1);
}
const script = path.join(root, 'figures', name, 'build.mjs');
for (const [flags, directory] of [[[], name], [['--light'], `${name}-light`]]) {
  const run = spawnSync(process.execPath, [script, ...flags, '--out', path.join(root, 'static/anatomy', directory)], {stdio: 'inherit'});
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log(`wrote ${await writeThumbnail(root, name)}`);
