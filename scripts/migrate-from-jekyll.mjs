// One-off migration: Hydejack/Jekyll (jyje/profile) posts -> Docusaurus content/{ko,en}/blog
// Usage: node scripts/migrate-from-jekyll.mjs [path-to-jekyll-repo]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as yaml from 'js-yaml';

const SRC = process.argv[2] ?? path.join(os.homedir(), 'repo/jyje/profile');
const ROOT = path.resolve(import.meta.dirname, '..');
const LANGS = ['ko', 'en'];
const legacyStatic = new Set();

const routePrefix = (lang) => (lang === 'ko' ? '' : `/${lang}`);

function copyAsset(srcRel, destDir, seen) {
  const from = path.join(SRC, srcRel);
  const name = path.basename(srcRel);
  if (seen.has(name) && seen.get(name) !== srcRel) {
    throw new Error(`asset name collision: ${name} (${seen.get(name)} vs ${srcRel})`);
  }
  seen.set(name, srcRel);
  if (!fs.existsSync(from)) {
    console.warn(`  missing asset: ${srcRel}`);
    return name;
  }
  fs.mkdirSync(destDir, {recursive: true});
  fs.copyFileSync(from, path.join(destDir, name));
  return name;
}

function mapLink(url, lang) {
  const p = routePrefix(lang);
  let m;
  if ((m = url.match(/^\/(?:ko|en)\/posts\/([^/#?]+)\/?(.*)$/))) return `${p}/blog/${m[1]}${m[2] ? '/' + m[2] : ''}`;
  if ((m = url.match(/^\/tags\/([^/#?]+)\/?(?:#.*)?$/))) return `/tags/${m[1]}`;
  if ((m = url.match(/^\/(?:ko|en)\/(resume|portfolio)\/?$/))) return `${p}/${m[1]}`;
  return url;
}

function cardsToList(block, lang) {
  const items = yaml.loadAll(block).flat().filter(Boolean);
  return items
    .map((it) => {
      const desc = String(it.description ?? '')
        .trim()
        .split(/\n\s*\n/)
        .map((para) =>
          para
            .split('\n')
            .map((l) => l.replace(/^\s*-\s+/, '').trim())
            .filter(Boolean)
            .join(' · '),
        )
        .join(' / ');
      const title = it.link ? `[${it.title}](${mapLink(it.link, lang)})` : `**${it.title}**`;
      return `- ${title}${desc ? `: ${desc}` : ''}`;
    })
    .join('\n');
}

function convertPost(file, lang, blogDir, assetsSeen) {
  const base = path.basename(file);
  const [, date, slug] = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = yaml.load(m[1]) ?? {};
  let body = m[2];
  const assetsDir = path.join(blogDir, 'assets');

  let title = fm.title;
  const h1 = body.match(/^\s*#\s+(.+)\n/);
  if (h1) {
    title ??= h1[1].trim();
    body = body.replace(h1[0], '');
  }

  body = body.replace(/^[*-]\s+(?:UNORDERED\s+)?TOC\s*\n\{:toc[^}]*\}\s*\n/gim, '');
  body = body.replace(/^\{:toc[^}]*\}\s*\n/gm, '');

  body = body.replace(/<div style="margin-top: 5rem;">\s*\{%\s*include components\/dingbat\.html\s*%\}\s*<\/div>/g, '* * *');
  body = body.replace(/\{%\s*include components\/dingbat\.html\s*%\}/g, '* * *');

  body = body.replace(/```card\n([\s\S]*?)\n```/g, (_, block) => cardsToList(block, lang));

  body = body.replace(/^(?!\{:)(.+)\n\{:\.figcaption\}[ \t]*$/gm, (_, cap) =>
    /^\*|\*$/.test(cap.trim()) ? cap : `*${cap.trim()}*`,
  );
  body = body.replace(/^\{:\.figcaption\}[ \t]*\n?/gm, '');

  body = body.replace(/!\[([^\]]*)\]\((\/assets\/[^)\s]+)\)(\{:[^}\n]*\})?/g, (_, alt, src) => {
    const name = copyAsset(src, assetsDir, assetsSeen);
    return `![${alt}](./assets/${name})`;
  });
  body = body.replace(/(src=")(\/assets\/[^"]+)(")/g, (_, a, src, c) => {
    const name = path.basename(src);
    legacyStatic.add(src);
    return `${a}/img/legacy/${name}${c}`;
  });
  body = body.replace(/\]\((\/[^)\s]*)\)(\{:[^}\n]*\})?/g, (whole, url) =>
    url.startsWith('/assets/') ? whole : `](${mapLink(url, lang)})`,
  );
  body = body.replace(/^(\[[^\]]+\]:\s*)(\/(?!assets\/)\S*)/gm, (_, label, url) => `${label}${mapLink(url, lang)}`);
  body = body.replace(/\{:[^}\n]*\}/g, '');

  const blocks = body.split(/\n{2,}/);
  const idx = blocks.findIndex((b) => b.trim().length > 40 && !/^\s*([#!<>|`-]|\d+\.)/.test(b) && !b.includes('!['));
  if (idx >= 0 && idx < blocks.length - 1) blocks.splice(idx + 1, 0, '<!-- truncate -->');
  body = blocks.join('\n\n').replace(/^\n+/, '');

  let image;
  const rawImage = typeof fm.image === 'string' ? fm.image : fm.image?.path;
  if (rawImage?.startsWith('/assets/')) image = `./assets/${copyAsset(rawImage, assetsDir, assetsSeen)}`;

  const out = {
    title,
    slug,
    ...(fm.description ? {description: String(fm.description).replace(/\s+/g, ' ').trim()} : {}),
    authors: ['jyje'],
    tags: [].concat(fm.tags ?? []).map(String),
    ...(image ? {image} : {}),
  };
  const head = yaml.dump(out, {lineWidth: -1, quotingType: '"'});
  fs.writeFileSync(path.join(blogDir, `${date}-${slug}.md`), `---\n${head}---\n\n${body.trimEnd()}\n`);
  return out.tags;
}

const tagsUsed = new Set();
for (const lang of LANGS) {
  const blogDir = path.join(ROOT, 'content', lang, 'blog');
  fs.mkdirSync(blogDir, {recursive: true});
  const dir = path.join(SRC, lang, 'posts/_posts');
  const seen = new Map();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  for (const f of files) {
    for (const t of convertPost(path.join(dir, f), lang, blogDir, seen)) tagsUsed.add(t);
  }
  console.log(`${lang}: ${files.length} posts`);
}

const tags = {};
const tagDir = path.join(SRC, '_featured_tags');
for (const f of fs.readdirSync(tagDir).filter((f) => f.endsWith('.md'))) {
  const fm = yaml.load(fs.readFileSync(path.join(tagDir, f), 'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
  tags[fm.slug] = {
    label: fm.title,
    permalink: `/${fm.slug}`,
    description: String(fm.description ?? fm.title).replace(/\s+/g, ' ').trim(),
  };
}
for (const t of tagsUsed) {
  if (!tags[t]) {
    console.warn(`tag without tag page, generating: ${t}`);
    const label = t.charAt(0).toUpperCase() + t.slice(1);
    tags[t] = {label, permalink: `/${t}`, description: `${label} related posts`};
  }
}
for (const lang of LANGS) {
  fs.writeFileSync(path.join(ROOT, 'content', lang, 'blog', 'tags.yml'), yaml.dump(tags, {lineWidth: -1}));
}

const authors = {
  ko: {name: '전제영', title: 'AI Platform Engineer'},
  en: {name: 'Jeayoung Jeon', title: 'AI Platform Engineer'},
};
for (const lang of LANGS) {
  const a = {
    jyje: {
      ...authors[lang],
      url: 'https://github.com/jyje',
      image_url: 'https://github.com/jyje.png',
      socials: {github: 'jyje', linkedin: 'jyje'},
    },
  };
  fs.writeFileSync(path.join(ROOT, 'content', lang, 'blog', 'authors.yml'), yaml.dump(a, {lineWidth: -1}));
}

const legacyDir = path.join(ROOT, 'static/img/legacy');
fs.mkdirSync(legacyDir, {recursive: true});
for (const src of legacyStatic) {
  const from = path.join(SRC, src);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(legacyDir, path.basename(src)));
}
console.log(`tags: ${Object.keys(tags).length}, legacy static: ${legacyStatic.size}`);
