import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formatContent, contentViolations, contentKind} from './content-format/v1.mjs';

export async function authoredFiles(root) {
  const result = [];
  for (const folder of ['content/ko', 'content/en', 'src/pages', 'i18n/en/docusaurus-plugin-content-pages']) {
    for (const file of await fs.readdir(path.join(root, folder), {recursive: true})) {
      const relative = `${folder}/${file}`;
      if (contentKind(relative)) result.push(relative);
    }
  }
  return result.sort();
}
export async function runContentFormat({root = process.cwd(), write = false, migrate = false} = {}) {
  const failures = []; let changed = 0;
  for (const file of await authoredFiles(root)) {
    const target = path.join(root, file);
    try {
      const before = await fs.readFile(target, 'utf8');
      const after = await formatContent(before, file, {root, migrate});
      if (before !== after) {
        changed++;
        if (write) await fs.writeFile(target, after);
        else failures.push(`${file}: FORMAT-001: run content:format`);
      }
      failures.push(...contentViolations(write ? after : before, file).map(e => `${file}: ${e}`));
    } catch (error) {failures.push(`${file}: ${error.message}`);}
  }
  return {changed, failures};
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await runContentFormat({write: process.argv.includes('--write'), migrate: process.argv.includes('--migrate')});
  for (const error of result.failures) console.error(error);
  console.log(`Content formatter v1: ${result.changed} changed/unformatted, ${result.failures.length} violations`);
  if (result.failures.length) process.exitCode = 1;
}
