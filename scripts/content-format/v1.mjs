import fs from 'node:fs';
import * as yaml from 'js-yaml';
import prettier from 'prettier';
import {marked} from 'marked';
import contentTemplates from '../../plugins/content-templates/remark-plugin.cjs';

export const formatterVersion = 1;
export function contentKind(file) {
  if (/^content\/(ko|en)\/(blog|wiki)\/.+\.mdx?$/.test(file)) return file.split('/')[2];
  if (/^(src\/pages|i18n\/en\/docusaurus-plugin-content-pages)\/.+\.mdx?$/.test(file)) return 'page';
  return null;
}
export function splitDocument(text) {
  const match = text.replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  return match ? {front: match[1], data: yaml.load(match[1]) ?? {}, body: text.replaceAll('\r\n', '\n').slice(match[0].length)}
    : {front: '', data: {}, body: text.replaceAll('\r\n', '\n')};
}
export function headingNodes(body) {
  return marked.lexer(body).filter(token => token.type === 'heading');
}

export async function formatContent(text, file, {migrate = false, root = process.cwd()} = {}) {
  const kind = contentKind(file);
  if (!kind) return text;
  const contract = JSON.parse(fs.readFileSync(`${root}/design-system/content-contract.json`, 'utf8'));
  if (contract.formatter.version !== formatterVersion || contract.formatter.engineVersion !== prettier.version) throw new Error('Formatter/manifest version mismatch; install the pinned dependency or run an explicit migration');
  const doc = splitDocument(text);
  const version = doc.data.profile_template;
  if (version && (version.kind !== kind || version.version !== 1)) throw new Error(`Unsupported template for ${file}; an explicit migration is required`);
  if (doc.data.profile_format != null && doc.data.profile_format !== 1) throw new Error(`Unsupported formatter version: ${file}`);
  let front = doc.front;
  if (migrate) {
    if (!version) front += `${front ? '\n' : ''}profile_template: {kind: ${kind}, version: 1}`;
    if (doc.data.profile_format == null) front += '\nprofile_format: 1';
  }
  let body = doc.body;
  // Blog's native header already owns h1. Shift heading ranks only, leaving
  // titles, IDs, links and prose unchanged. Code fences are not heading tokens.
  if (migrate && kind === 'blog' && headingNodes(body).some(token => token.depth === 1)) {
    const tokens = marked.lexer(body);
    let demote = false;
    body = tokens.map(token => {
      if (token.type === 'heading' && token.depth === 1) demote = true;
      return demote && token.type === 'heading' && token.raw.startsWith('#')
        ? token.raw.replace(/^#{1,6}(?=\s)/, hashes => hashes.length < 6 ? '#' + hashes : hashes)
        : token.raw;
    }).join('');
  }
  const input = front ? `---\n${front}\n---\n\n${body.trimStart()}` : body;
  const config = JSON.parse(fs.readFileSync(`${root}/design-system/format-v1.json`, 'utf8'));
  return prettier.format(input, {...config, filepath: file, parser: file.endsWith('.mdx') ? 'mdx' : 'markdown'});
}

export function contentViolations(text, file) {
  const kind = contentKind(file);
  if (!kind) return [];
  const {data, body} = splitDocument(text);
  const errors = [];
  if (data.profile_template?.kind !== kind || data.profile_template?.version !== 1 || data.profile_format !== 1) errors.push('CONTENT-001: missing/outdated template or formatter stamp; run content:migrate');
  const headings = headingNodes(body);
  for (const token of marked.lexer(body)) {
    if (token.type === 'code' && contentTemplates.schemas[token.lang]) {
      try {contentTemplates.validateItems(yaml.load(token.text), contentTemplates.schemas[token.lang], token.lang);}
      catch(e) {errors.push(`CONTENT-004: ${e.message}`);}
    }
  }
  if (!data.title && !headings.some(h => h.depth === 1)) errors.push('CONTENT-002: authored title is required');
  if (kind === 'blog' && headings.some(h => h.depth === 1)) errors.push('CONTENT-002: native blog header owns h1; body starts at h2');
  if (kind !== 'page' && headings.filter(h => h.depth === 1).length > 1) errors.push('CONTENT-002: multiple document h1 headings');
  if (kind === 'page' && !data.breadcrumbs && data.wrapperClassName !== 'site-labs-page') errors.push('UX-001: page front matter must declare breadcrumbs');
  const prose = marked.lexer(body).filter(token => token.type !== 'code').map(token => token.raw).join('').replace(/`+[^`]*`+/g, '');
  if (/<(?:SiteBreadcrumbs|BreadcrumbFrame)\b/.test(prose) || /\bstyle=/.test(prose)) errors.push('DS-003: authored content supplies data, not inline layout/breadcrumb placement');
  return errors;
}
