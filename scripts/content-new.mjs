import fs from 'node:fs/promises';
import path from 'node:path';
import * as yaml from 'js-yaml';
import {formatContent} from './content-format/v1.mjs';
import {titleEmoji} from './validate-wiki-titles.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((list, value, i, all) => {
  if (value.startsWith('--')) list.push([value.slice(2), all[i + 1]]); return list;
}, []));
const {kind, locale, title, layout} = args;
if (layout && kind !== 'wiki') throw new Error('--layout applies to wiki pages only');
if (!['wiki', 'blog', 'page'].includes(kind) || !['ko', 'en'].includes(locale) || !title || !args.path) throw new Error('Use --kind wiki|blog|page --locale ko|en --path relative.md --title "Title"');
if (/[\r\n]/.test(title)) throw new Error('A title must be one line');
if (kind === 'wiki') titleEmoji(title, args.path);
if (path.isAbsolute(args.path) || args.path.includes('\\') || args.path.split('/').some(s => ['..', '.', ''].includes(s))) throw new Error('Unsafe content path');
if (kind === 'blog' && !/^\d{4}-\d{2}-\d{2}-/.test(args.path)) throw new Error('Blog path must supply its authored YYYY-MM-DD-slug date; build time is not a publication date');
const base = kind === 'page' ? (locale === 'ko' ? 'src/pages' : 'i18n/en/docusaurus-plugin-content-pages') : `content/${locale}/${kind}`;
const file = `${base}/${args.path}`;
if (!/\.mdx?$/.test(file)) throw new Error('Content extension must be .md or .mdx');
let ancestor = path.dirname(path.resolve(file));
while (true) {try {ancestor = await fs.realpath(ancestor); break;} catch(e) {if(e.code !== 'ENOENT') throw e; ancestor = path.dirname(ancestor);}}
const projectRoot = await fs.realpath(process.cwd());
if (ancestor !== projectRoot && !ancestor.startsWith(projectRoot + path.sep)) throw new Error('Content path escapes the project through a symlink');
const manifest = JSON.parse(await fs.readFile('design-system/content-contract.json', 'utf8'));
// A layout (for example --layout reference) swaps the generic wiki scaffold for a versioned page structure.
const layoutEntry = layout ? manifest.layouts?.[layout] : undefined;
if (layout && !layoutEntry) throw new Error(`Unknown layout "${layout}"; choose one of: ${Object.keys(manifest.layouts ?? {}).join(', ')}`);
const layoutVersion = args['layout-version'] ?? layoutEntry?.latest;
if (layout && !layoutEntry.versions[layoutVersion]) throw new Error(`Unknown version ${layoutVersion} for layout "${layout}"`);
const template = layout ? layoutEntry.versions[layoutVersion].templates[locale] : manifest.templates[kind].file.replace('{locale}', locale);
const source = (await fs.readFile(template, 'utf8')).replaceAll('TITLE_VALUE', yaml.dump(title).trimEnd()).replaceAll('TITLE_TEXT', title);
const formatted = await formatContent(source, file, {migrate: true});
await fs.mkdir(path.dirname(file), {recursive: true});
// wx refuses overwrites, including symlinks to existing files.
await fs.writeFile(file, formatted, {flag: 'wx'});
console.log(`Created ${file} from ${layout ? `${kind}/v1 + ${layout}@${layoutVersion}` : `${kind}/v1`}; edit placeholders before publication.`);
