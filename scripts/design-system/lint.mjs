import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cssDesign, jsxDesign} from './rules.mjs';
import {validateWikiTitles} from '../validate-wiki-titles.mjs';
import postcss from 'postcss';

export async function runDesignLint(root = process.cwd(), {fix = false} = {}) {
  const errors = []; let changed = 0;
  const tokens = new Set(); const referencedTokens = new Set();
  for (const relative of await fs.readdir(path.join(root, 'src'), {recursive: true})) {
    if (!/\.(css|tsx)$/.test(relative) || relative.startsWith('generated/')) continue;
    const file = `src/${relative}`; const target = path.join(root, file);
    const before = await fs.readFile(target, 'utf8');
    try {
      if (relative.endsWith('.css')) postcss.parse(before).walkDecls(decl => {
        if (decl.prop.startsWith('--')) tokens.add(decl.prop);
        for (const match of decl.value.matchAll(/var\((--site-(?:space-[\w-]+|shadow-soft))\b/g)) referencedTokens.add(match[1]);
      });
      const result = relative.endsWith('.css') ? cssDesign(before, file, {fix}) : jsxDesign(before, file, {fix});
      errors.push(...result.errors.map(e => `${file}: ${e}`));
      if (fix && result.text !== before) {await fs.writeFile(target, result.text); changed++;}
    } catch (e) {errors.push(`${file}: ${e.message}`);}
  }
  for (const token of referencedTokens) if (!tokens.has(token)) errors.push(`DS-002: referenced token ${token} has no definition`);
  const templates = path.join(root, 'src/components/ContentTemplates');
  for (const entry of await fs.readdir(templates, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    for (const name of ['index.tsx', 'styles.module.css']) {
      try {await fs.access(path.join(templates, entry.name, name));}
      catch {errors.push(`DS-003: ${entry.name} needs its own ${name}`);}
    }
  }
  try {validateWikiTitles(root);} catch (e) {errors.push(`CONTENT-003: ${e.message}`);}
  return {changed, errors};
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await runDesignLint(process.cwd(), {fix: process.argv.includes('--fix')});
  result.errors.forEach(e => console.error(e));
  console.log(`Design rules v1: ${result.changed} files fixed, ${result.errors.length} violations`);
  if (result.errors.length) process.exitCode = 1;
}
