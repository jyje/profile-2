import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

export function titleEmoji(title, file) {
  const value = String(title ?? '');
  const first = [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(value)][0]?.segment ?? '';
  const emoji = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3)/u;
  if (!emoji.test(first) || value.includes('🧠') || emoji.test(value.slice(first.length).trim())) {
    throw new Error(`Wiki title must start with one non-brain emoji: ${file}`);
  }
  return first;
}

// Validate authored sources before publication filtering, including local-only notes.
export function validateWikiTitles(root) {
  const locales = new Map();
  for (const locale of ['ko', 'en']) {
    const directory = path.join(root, 'content', locale, 'wiki');
    const titles = new Map(); locales.set(locale, titles);
    if (!fs.existsSync(directory)) continue;
    for (const relative of fs.readdirSync(directory, {recursive: true})) {
      const file = path.join(directory, relative);
      if (/\.mdx?$/.test(relative)) {
        const source = fs.readFileSync(file, 'utf8');
        const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const metadata = match ? yaml.load(match[1]) : {};
        const title = metadata?.title ?? source.match(/^#\s+(.+)$/m)?.[1];
        const emoji = titleEmoji(title, file);
        if (metadata?.sidebar_label) {
          if (titleEmoji(metadata.sidebar_label, file) !== emoji) throw new Error(`Sidebar emoji differs: ${file}`);
        }
        titles.set(relative.replace(/\.mdx?$/, ''), emoji);
      } else if (path.basename(relative) === '_category_.json') {
        const category = JSON.parse(fs.readFileSync(file, 'utf8'));
        titles.set(relative, titleEmoji(category.label, file));
      }
    }
  }
  for (const [file, emoji] of locales.get('en')) {
    const korean = locales.get('ko').get(file);
    if (korean && korean !== emoji) throw new Error(`Translated wiki emoji differs: ${file}`);
  }
}
