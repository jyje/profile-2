import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as yaml from 'js-yaml';

// Structural lint for every authored document that can render: content/{ko,en}/{wiki,blog}.
// Baseline checks apply to all of them. A document that declares `template: <id>@<N>`
// also gets that template version's rules from templates/<id>/v<N>/rules.json.
// Templates live outside content/, so they are never staged or rendered (see test-lint-content.mjs).

const LOCALES = ['ko', 'en'];
const KINDS = ['wiki', 'blog'];
const TEMPLATE_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)@(\d+)$/;

export function loadTemplates(root) {
  const registry = new Map();
  const base = path.join(root, 'templates');
  if (!fs.existsSync(base)) return registry;
  for (const id of fs.readdirSync(base, {withFileTypes: true}).filter(entry => entry.isDirectory())) {
    for (const version of fs.readdirSync(path.join(base, id.name), {withFileTypes: true})) {
      const match = version.isDirectory() && version.name.match(/^v(\d+)$/);
      const file = match && path.join(base, id.name, version.name, 'rules.json');
      if (!file || !fs.existsSync(file)) continue;
      registry.set(`${id.name}@${match[1]}`, {...JSON.parse(fs.readFileSync(file, 'utf8')), key: `${id.name}@${match[1]}`, templateId: id.name, templateVersion: Number(match[1])});
    }
  }
  return registry;
}

const latestVersion = (registry, id) => Math.max(0, ...[...registry.values()].filter(rule => rule.templateId === id).map(rule => rule.templateVersion));

export function parseDocument(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  let frontMatter = {};
  let frontMatterError;
  if (match) {
    try { frontMatter = yaml.load(match[1]) ?? {}; } catch (error) { frontMatterError = error.message.split('\n')[0]; }
  }
  const offset = match ? match[0].split('\n').length - 1 : 0;
  const lines = source.slice(match ? match[0].length : 0).split('\n');
  const headings = [];
  const fences = [];
  const images = [];
  let open;
  lines.forEach((text, index) => {
    const line = index + 1 + offset;
    const fence = text.match(/^\s*(`{3,}|~{3,})\s*([^\s`]*)/);
    if (open) {
      if (fence && fence[1][0] === open.char && fence[1].length >= open.length && !text.replace(/^\s*[`~]+/, '').trim()) {
        fences.push({lang: open.lang, line: open.line, end: line, value: open.value.join('\n')});
        open = undefined;
      } else open.value.push(text);
      return;
    }
    if (fence) { open = {char: fence[1][0], length: fence[1].length, lang: fence[2], line, value: []}; return; }
    const heading = text.match(/^(#{1,6})\s+(.*?)\s*$/);
    if (heading) headings.push({level: heading[1].length, text: heading[2].replace(/\s*\{#[^}]+\}$/, ''), raw: text, line});
    else if (/^\s*!\[[^\]]*\]\([^)]+\)/.test(text) || /^\s*<img\s/i.test(text)) images.push({line});
  });
  return {frontMatter, frontMatterError, headings, fences, images, empty: !lines.join('').trim(), lines, offset};
}

export function sectionsOf(document) {
  const h2 = document.headings.filter(heading => heading.level === 2);
  return h2.map((heading, index) => {
    const end = h2[index + 1]?.line ?? document.offset + document.lines.length + 1;
    const body = document.lines.slice(heading.line - document.offset, end - document.offset - 1).filter(text => text.trim());
    return {...heading, empty: body.length === 0};
  });
}

export function introKinds(document) {
  const first = document.headings.find(heading => heading.level === 2)?.line ?? Infinity;
  const kinds = new Set();
  for (const fence of document.fences) {
    if (fence.line >= first) continue;
    if (fence.lang === 'anatomy-figure') kinds.add('anatomy-figure');
    if (fence.lang === 'mermaid') kinds.add('diagram');
  }
  if (document.images.some(image => image.line < first)) kinds.add('image');
  return kinds;
}

export function lintDocument(root, file, source, registry, {assets = true} = {}) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const out = [];
  const add = (severity, rule, line, message) => out.push({severity, rule, file: relative, line, message});
  const document = parseDocument(source);
  if (document.frontMatterError) add('error', 'front-matter-invalid', 1, document.frontMatterError);

  // Baseline: every rendered document.
  for (const heading of document.headings) {
    if (/\s$/.test(heading.raw.replace(/\r$/, ''))) add('error', 'heading-trailing-space', heading.line, `Heading has trailing whitespace: ${heading.text}`);
  }
  document.headings.forEach((heading, index) => {
    const previous = document.headings[index - 1];
    if (heading.level === 1) add('warn', 'heading-body-h1', heading.line, `The title comes from front matter; avoid a body H1: ${heading.text}`);
    if (previous && heading.level > previous.level + 1) add('warn', 'heading-level-skip', heading.line, `H${previous.level} is followed by H${heading.level}: ${heading.text}`);
  });
  const seen = new Set();
  for (const heading of document.headings.filter(item => item.level === 2)) {
    if (seen.has(heading.text)) add('warn', 'heading-duplicate-h2', heading.line, `Duplicate H2: ${heading.text}`);
    seen.add(heading.text);
  }
  const image = document.frontMatter?.image;
  if (assets && typeof image === 'string' && image.startsWith('/') && !fs.existsSync(path.join(root, 'static', image))) {
    add('error', 'image-missing', 1, `front matter image not found: static${image}`);
  }
  const figures = document.fences.filter(item => item.lang === 'anatomy-figure');
  if (figures.length && image === undefined && (document.frontMatter?.type === 'Reference' || document.frontMatter?.template !== undefined)) {
    add('warn', 'anatomy-thumbnail', 1, 'Add an `image:` front matter (npm run build:anatomy writes static/anatomy/<name>/thumbnail.png)');
  }
  if (assets) {
    for (const fence of figures) {
      let name;
      try { name = yaml.load(fence.value)?.[0]?.name; } catch { name = undefined; }
      if (typeof name !== 'string') { add('error', 'anatomy-name', fence.line, 'anatomy-figure needs a name'); continue; }
      for (const directory of [name, `${name}-light`]) {
        if (!fs.existsSync(path.join(root, 'static/anatomy', directory, 'index.html'))) add('error', 'anatomy-asset-missing', fence.line, `Missing static/anatomy/${directory}/index.html`);
      }
    }
  }

  // Template: opt-in, versioned.
  const declared = document.frontMatter?.template;
  if (declared === undefined) return {diagnostics: out, document, template: undefined};
  const parts = typeof declared === 'string' && declared.match(TEMPLATE_PATTERN);
  const rules = parts && registry.get(declared);
  if (!parts) { add('error', 'template-invalid', 1, `template must look like "wiki-reference@1", got ${JSON.stringify(declared)}`); return {diagnostics: out, document, template: undefined}; }
  if (!rules) { add('error', 'template-unknown', 1, `Unknown template ${declared}`); return {diagnostics: out, document, template: undefined}; }
  if (latestVersion(registry, rules.templateId) > rules.templateVersion) add('warn', 'template-outdated', 1, `${declared} is older than v${latestVersion(registry, rules.templateId)}`);

  for (const key of rules.frontMatter?.required ?? []) {
    if (document.frontMatter[key] === undefined || document.frontMatter[key] === null) add('error', 'template-front-matter', 1, `Front matter "${key}" is required by ${declared}`);
  }
  // A title-only translation borrows its body from another locale, so there is nothing to check.
  if (document.empty) return {diagnostics: out, document, template: rules};

  const level = rules.headings?.level ?? 2;
  const sections = sectionsOf(document);
  const order = rules.headings?.order ?? [];
  let last = -1;
  const present = new Set();
  for (const section of sections.filter(item => item.level === level)) {
    const position = order.indexOf(section.text);
    if (position < 0) add('error', 'template-heading-unknown', section.line, `H${level} "${section.text}" is not in ${declared}: ${order.join(', ')}`);
    else if (present.has(section.text)) add('error', 'template-heading-duplicate', section.line, `Duplicate H${level} "${section.text}"`);
    else if (position < last) add('error', 'template-heading-order', section.line, `"${section.text}" must come before "${order[last]}"`);
    else last = position;
    present.add(section.text);
    if (section.empty && rules.emptySections) add(rules.emptySections, 'template-section-empty', section.line, `Section "${section.text}" is empty`);
  }
  for (const required of rules.headings?.required ?? []) {
    if (!present.has(required)) add('error', 'template-heading-missing', 1, `Missing required H${level} "${required}"`);
  }
  // While a page is a draft the recommendation is a warning; once it is not, it is required.
  const gate = rules.statusGate;
  const draft = gate ? document.frontMatter?.[gate.field] === gate.draft : true;
  for (const group of rules.headings?.recommendedOneOf ?? []) {
    if (!group.some(name => present.has(name))) add(draft ? 'warn' : 'error', 'template-heading-recommended', 1, `${draft ? 'Add' : `Not a draft (${gate.field}: ${document.frontMatter?.[gate.field] ?? 'unset'}), so add`} at least one of: ${group.join(', ')}`);
  }
  if (rules.introVisual?.required) {
    const kinds = introKinds(document);
    if (!rules.introVisual.kinds.some(kind => kinds.has(kind))) add('error', 'template-intro-visual', 1, `Put one of ${rules.introVisual.kinds.join(', ')} before the first H2`);
  }
  return {diagnostics: out, document, template: rules};
}

export function lintContent(root, options = {}) {
  const registry = loadTemplates(root);
  const diagnostics = [];
  const parsed = new Map();
  for (const locale of LOCALES) {
    for (const kind of KINDS) {
      const directory = path.join(root, 'content', locale, kind);
      if (!fs.existsSync(directory)) continue;
      for (const relative of fs.readdirSync(directory, {recursive: true}).sort()) {
        if (!/\.mdx?$/.test(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) continue;
        const file = path.join(directory, relative);
        const result = lintDocument(root, file, fs.readFileSync(file, 'utf8'), registry, options);
        diagnostics.push(...result.diagnostics);
        parsed.set(`${locale}/${kind}/${relative.replace(/\.mdx?$/, '')}`, {...result, file});
      }
    }
  }
  // Both locales must agree on structure once both have a body.
  for (const [key, korean] of parsed) {
    if (!key.startsWith('ko/')) continue;
    const english = parsed.get(key.replace(/^ko\//, 'en/'));
    if (!english?.template || !korean.template || korean.document.empty || english.document.empty) continue;
    const sequence = result => result.document.headings.filter(heading => heading.level === (result.template.headings?.level ?? 2)).map(heading => heading.text).join(' > ');
    if (korean.template.key !== english.template.key) diagnostics.push({severity: 'error', rule: 'template-locale-parity', file: path.relative(root, english.file).replaceAll('\\', '/'), line: 1, message: `ko uses ${korean.template.key} but en uses ${english.template.key}`});
    else if (sequence(korean) !== sequence(english)) diagnostics.push({severity: 'error', rule: 'template-locale-parity', file: path.relative(root, english.file).replaceAll('\\', '/'), line: 1, message: `H2 sequence differs from ko: [${sequence(english)}] vs [${sequence(korean)}]`});
  }
  // Legacy: wiki references that have not adopted a template yet.
  for (const [key, result] of parsed) {
    if (key.startsWith('ko/wiki/d/') && result.document.frontMatter?.type === 'Reference' && result.document.frontMatter?.template === undefined) {
      diagnostics.push({severity: 'info', rule: 'template-legacy', file: path.relative(root, result.file).replaceAll('\\', '/'), line: 1, message: 'No template declared'});
    }
  }
  return diagnostics;
}


// Safe, mechanical repairs only. Anything that needs judgement is left alone and reported by the lint.
export function fixDocument(source, locale = 'ko') {
  const fixes = [];
  const document = parseDocument(source);
  const lines = source.split('\n');
  for (const heading of document.headings) {
    const index = heading.line - 1;
    if (/[ \t]+\r?$/.test(lines[index]) && !/^\s*$/.test(lines[index])) {
      lines[index] = lines[index].replace(/[ \t]+(\r?)$/, '$1');
      fixes.push({rule: 'heading-trailing-space', line: heading.line});
    }
  }
  let text = lines.join('\n');
  // "## Name" holding only bullets becomes a notation line at the end of "## Definition".
  const reparsed = parseDocument(text);
  const sections = sectionsOf(reparsed);
  const name = sections.find(section => section.text === 'Name');
  const definition = sections.find(section => section.text === 'Definition');
  if (name && definition && name.line < definition.line && !name.empty) {
    const all = text.split('\n');
    const nameEnd = (sections[sections.indexOf(name) + 1]?.line ?? all.length + 1) - 1;
    const body = all.slice(name.line, nameEnd);
    const hasSubheading = reparsed.headings.some(heading => heading.line > name.line && heading.line <= nameEnd);
    const content = body.filter(line => line.trim());
    // Only the unambiguous case: one top-level bullet, no nesting. Anything else needs a person.
    if (!hasSubheading && content.length === 1 && /^-\s+\S/.test(content[0])) {
      const label = locale === 'en' ? 'Also written' : '표기';
      const notation = [`- ${label}: ${content[0].replace(/^-\s+/, '').trim()}`];
      const next = sections[sections.indexOf(definition) + 1];
      const definitionEnd = (next?.line ?? all.length + 1) - 1;
      let insertAt = definitionEnd;
      while (insertAt > definition.line && !all[insertAt - 1].trim()) insertAt--;
      const rebuilt = [
        ...all.slice(0, name.line - 1),
        ...all.slice(nameEnd).filter((_, i, rest) => !(i === 0 && !rest[0].trim() && !all[name.line - 2]?.trim())),
      ];
      // Recompute the insertion point after the Name block is removed.
      const removed = nameEnd - (name.line - 1);
      const target = insertAt - removed;
      rebuilt.splice(target, 0, ...notation);
      text = rebuilt.join('\n');
      fixes.push({rule: 'legacy-name-section', line: name.line});
    }
  }
  return {text, fixes};
}

export function fixContent(root, {write = true} = {}) {
  const changed = [];
  for (const locale of LOCALES) {
    for (const kind of KINDS) {
      const directory = path.join(root, 'content', locale, kind);
      if (!fs.existsSync(directory)) continue;
      for (const relative of fs.readdirSync(directory, {recursive: true}).sort()) {
        if (!/\.mdx?$/.test(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) continue;
        const file = path.join(directory, relative);
        const source = fs.readFileSync(file, 'utf8');
        const {text, fixes} = fixDocument(source, locale);
        if (!fixes.length) continue;
        if (write) fs.writeFileSync(file, text);
        changed.push({file: path.relative(root, file).replaceAll('\\', '/'), fixes});
      }
    }
  }
  return changed;
}

export function assertContentLint(root) {
  const errors = lintContent(root).filter(item => item.severity === 'error');
  if (errors.length) throw new Error(`Content lint failed:\n${errors.map(format).join('\n')}\nRun "npm run lint:content" for details.`);
}

const format = item => `${item.severity.padEnd(5)} ${item.file}:${item.line}  ${item.rule}  ${item.message}`;

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const root = path.resolve(import.meta.dirname, '..');
  if (process.argv.includes('--fix')) {
    const dry = process.argv.includes('--dry-run');
    const changed = fixContent(root, {write: !dry});
    for (const item of changed) console.log(`${dry ? 'would fix' : 'fixed'} ${item.file}: ${item.fixes.map(fix => `${fix.rule}@${fix.line}`).join(', ')}`);
    console.log(`[lint-content] ${dry ? 'dry run: ' : ''}${changed.length} files ${dry ? 'would change' : 'changed'}`);
    if (dry) process.exit(0);
  }
  const strict = process.argv.includes('--strict');
  const verbose = process.argv.includes('--verbose');
  const all = lintContent(root);
  const errors = all.filter(item => item.severity === 'error' || (strict && item.severity === 'warn'));
  const shown = all.filter(item => verbose || item.severity !== 'info');
  for (const item of shown) console.log(format(item));
  const count = severity => all.filter(item => item.severity === severity).length;
  console.log(`[lint-content] ${count('error')} errors, ${count('warn')} warnings, ${count('info')} legacy notes${verbose ? '' : ' (use --verbose to list them)'}`);
  process.exitCode = errors.length ? 1 : 0;
}
