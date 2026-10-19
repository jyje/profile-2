import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {introKinds, parseDocument} from './lint-content.mjs';

// Which wiki references are filled in, and which still need "my" part (Understanding, Usage).
export function reportContent(root) {
  const directory = path.join(root, 'content/ko/wiki/d');
  const rows = [];
  if (!fs.existsSync(directory)) return rows;
  for (const relative of fs.readdirSync(directory, {recursive: true}).sort()) {
    if (!/\.mdx?$/.test(relative) || relative.split(path.sep).some(part => part.startsWith('.') || part === 'index.md')) continue;
    const document = parseDocument(fs.readFileSync(path.join(directory, relative), 'utf8'));
    if (document.frontMatter?.type !== 'Reference') continue;
    const h2 = new Set(document.headings.filter(heading => heading.level === 2).map(heading => heading.text));
    rows.push({
      slug: relative.replace(/\.mdx?$/, ''),
      template: document.frontMatter.profile_layout ? `${document.frontMatter.profile_layout.kind}@${document.frontMatter.profile_layout.version}` : null,
      status: document.frontMatter.status ?? null,
      visual: [...introKinds(document)][0] ?? null,
      thumbnail: document.frontMatter.image !== undefined,
      understanding: h2.has('Understanding'),
      usage: h2.has('Usage'),
      details: h2.has('Details'),
      references: h2.has('References'),
    });
  }
  return rows;
}

export function formatReport(rows) {
  const mark = value => (value ? '✓' : '–');
  const lines = ['| Document | Template | Status | Visual | Thumb | Understanding | Usage | Details | References |', '|---|---|---|---|---|---|---|---|---|'];
  for (const row of rows) lines.push(`| ${row.slug} | ${row.template ?? 'legacy'} | ${row.status ?? '–'} | ${row.visual ?? '–'} | ${mark(row.thumbnail)} | ${mark(row.understanding)} | ${mark(row.usage)} | ${mark(row.details)} | ${mark(row.references)} |`);
  const count = predicate => rows.filter(predicate).length;
  lines.push('', `${rows.length} reference pages: ${count(row => row.template)} on a template, ${count(row => row.visual)} with an intro visual, ${count(row => row.understanding)} with Understanding, ${count(row => row.usage)} with Usage, ${count(row => row.status === 'draft')} marked draft.`);
  const missing = rows.filter(row => !row.understanding && !row.usage).map(row => row.slug);
  lines.push(`Missing both Understanding and Usage: ${missing.length ? missing.join(', ') : 'none'}`);
  return lines.join('\n');
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const rows = reportContent(path.resolve(import.meta.dirname, '..'));
  console.log(process.argv.includes('--json') ? JSON.stringify(rows, null, 2) : formatReport(rows));
}
