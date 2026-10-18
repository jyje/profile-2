// Every wiki and blog document needs an authored English file with an English
// title. A title-only file borrows its body from the other locale, preferring
// English over Korean; a document with no body in either locale fails the build.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export const LOCALES = ['ko', 'en'];
export const KINDS = ['wiki', 'blog'];
export const BODY_PRIORITY = ['en', 'ko'];
const MANIFEST = 'locale-fallbacks.json';

const NOTICES = {
  en: [
    '> [!note] English version unavailable',
    '> This article is currently available only in Korean. Use your browser’s built-in translation feature to read it in English.',
  ],
  ko: [
    '> [!note] 한국어 번역 준비 중',
    '> 이 글은 현재 영어로만 제공됩니다. 브라우저의 번역 기능으로 한국어로 읽을 수 있습니다.',
  ],
};

export function fallbackNotice(locale) {
  return `${NOTICES[locale].join('\n')}\n\n`;
}

export function parseDocument(markdown, file) {
  const match = markdown.match(/^(?:﻿)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  const data = match ? yaml.load(match[1]) ?? {} : {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Invalid document front matter: ${file}`);
  let body = match ? markdown.slice(match[0].length) : markdown;
  // A leading H1 is the title, not content, both as a title source and in a borrowed body.
  const heading = body.match(/^\s*#[ \t]+(.+?)[ \t]*#*[ \t]*(?:\r?\n|$)/);
  if (heading) body = body.slice(heading[0].length);
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : heading?.[1].trim() ?? '';
  const empty = body.replace(/<!--[\s\S]*?-->/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim() === '';
  return {data, body, title, empty};
}

function documents(root, locale, kind) {
  const directory = path.join(root, 'content', locale, kind);
  const found = new Map();
  if (!fs.existsSync(directory)) return found;
  for (const relative of fs.readdirSync(directory, {recursive: true})) {
    const normalized = relative.replaceAll('\\', '/');
    if (!/\.mdx?$/.test(normalized) || normalized.split('/').some(part => part.startsWith('.'))) continue;
    const key = normalized.replace(/\.mdx?$/, '');
    if (found.has(key)) throw new Error(`Both .md and .mdx exist for ${locale}/${kind}/${key}`);
    const file = path.join(directory, relative);
    found.set(key, {file, ...parseDocument(fs.readFileSync(file, 'utf8'), file)});
  }
  return found;
}

// Validate authored sources before publication filtering and return the body
// source for every title-only document, keyed by its authored file path.
export function planLocaleFallbacks(root) {
  const errors = [];
  const plan = new Map();
  for (const kind of KINDS) {
    const byLocale = Object.fromEntries(LOCALES.map(locale => [locale, documents(root, locale, kind)]));
    const keys = new Set(LOCALES.flatMap(locale => [...byLocale[locale].keys()]));
    for (const key of [...keys].sort()) {
      const label = `${kind}/${key}`;
      const english = byLocale.en.get(key);
      if (!english) errors.push(`Missing English document with an English title: content/en/${label}.md`);
      else if (!english.title) errors.push(`Missing English title: ${path.relative(root, english.file)}`);
      else if (/[\p{Script=Hangul}]/u.test(english.title)) errors.push(`English title contains Korean text: ${path.relative(root, english.file)}`);
      for (const locale of LOCALES) {
        const document = byLocale[locale].get(key);
        if (!document?.empty) continue;
        const sourceLocale = BODY_PRIORITY.find(candidate => byLocale[candidate].get(key)?.empty === false);
        if (!sourceLocale) {
          errors.push(`No body in any locale for ${path.relative(root, document.file)}; write the body in English or Korean`);
          continue;
        }
        plan.set(document.file, {locale: sourceLocale, ...byLocale[sourceLocale].get(key)});
      }
    }
  }
  if (errors.length) throw new Error(`Content locale validation failed:\n- ${errors.join('\n- ')}`);
  return plan;
}

// The title-only document keeps its title and authored front matter; routing
// fields it omits (slug, tags, dates, authors) come from the body source.
export function withLocaleFallback(markdown, file, source, locale) {
  const target = parseDocument(markdown, file);
  const data = {...source.data, ...target.data, title: target.title || source.title};
  return `---\n${yaml.dump(data, {lineWidth: -1, noRefs: true})}---\n\n${fallbackNotice(locale)}${source.body.replace(/^\s+/, '')}`;
}

// plugins/content-network.cjs reads this map of staged path -> locale whose body it shows.
export function writeFallbackManifest(output, entries) {
  fs.writeFileSync(path.join(output, MANIFEST), JSON.stringify(Object.fromEntries([...entries].sort())));
}

