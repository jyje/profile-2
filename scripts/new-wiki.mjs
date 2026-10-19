import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as yaml from 'js-yaml';
import {loadTemplates} from './lint-content.mjs';
import {titleEmoji} from './validate-wiki-titles.mjs';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Create a wiki reference page from a versioned template, in both locales.
// The Korean file is the full skeleton; the English file is title-only and borrows the body until translated.
export function scaffoldWiki(root, {slug, title, enTitle, tags = [], template = 'wiki-reference'}) {
  if (!KEBAB.test(slug ?? '')) throw new Error(`Slug must be kebab-case English: ${slug}`);
  titleEmoji(title, 'title');
  const english = enTitle ?? (/[가-힣]/.test(title) ? undefined : title);
  if (!english) throw new Error('The English title is required when the title contains Korean: pass --en-title');
  if (/[가-힣]/.test(english)) throw new Error('The English title must not contain Korean');
  titleEmoji(english, 'en-title');
  for (const tag of tags) if (!KEBAB.test(tag)) throw new Error(`Tags must be kebab-case English: ${tag}`);

  const registry = loadTemplates(root);
  const [id, requested] = template.split('@');
  const versions = [...registry.values()].filter(rule => rule.templateId === id).map(rule => rule.templateVersion);
  if (!versions.length) throw new Error(`Unknown template: ${id}`);
  const version = requested ? Number(requested) : Math.max(...versions);
  if (!registry.has(`${id}@${version}`)) throw new Error(`Unknown template version: ${id}@${version}`);
  const skeleton = fs.readFileSync(path.join(root, 'templates', id, `v${version}`, 'template.md'), 'utf8');

  const tagBlock = tags.length ? `tags:\n${tags.map(tag => `  - ${tag}`).join('\n')}` : 'tags: []';
  const body = skeleton
    .replace(/^title: .*$/m, `title: ${JSON.stringify(title)}`)
    .replace(/^tags:\n(?:  - .*\n?)+/m, `${tagBlock}\n`);
  const targets = {ko: path.join(root, 'content/ko/wiki/d', `${slug}.md`), en: path.join(root, 'content/en/wiki/d', `${slug}.md`)};
  for (const file of Object.values(targets)) if (fs.existsSync(file)) throw new Error(`Already exists: ${path.relative(root, file)}`);
  fs.mkdirSync(path.dirname(targets.ko), {recursive: true});
  fs.mkdirSync(path.dirname(targets.en), {recursive: true});
  fs.writeFileSync(targets.ko, body);
  fs.writeFileSync(targets.en, `---\ntitle: ${JSON.stringify(english)}\n---\n`);

  const warnings = [];
  const registryFile = path.join(root, 'data/tags.yml');
  if (fs.existsSync(registryFile)) {
    const known = yaml.load(fs.readFileSync(registryFile, 'utf8'))?.tags ?? {};
    for (const tag of tags) if (!(tag in known)) warnings.push(`Tag "${tag}" is not defined in data/tags.yml`);
  }
  return {files: Object.values(targets).map(file => path.relative(root, file).replaceAll('\\', '/')), template: `${id}@${version}`, warnings};
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const args = process.argv.slice(2);
  const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
  const positional = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
  const [slug, title] = positional;
  try {
    if (!slug || !title) throw new Error('Usage: npm run new:wiki -- <slug> "<🍓 title>" [--en-title "<🍓 English title>"] [--tags a,b] [--template wiki-reference@1]');
    const result = scaffoldWiki(path.resolve(import.meta.dirname, '..'), {slug, title, enTitle: option('--en-title'), tags: option('--tags')?.split(',').filter(Boolean) ?? [], template: option('--template')});
    for (const file of result.files) console.log(`created ${file}`);
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    console.log(`template ${result.template}. Next: keep one intro visual, delete unused sections, then run npm run lint:content`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
