const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const cleanPath = value => {
  try { return decodeURI(value).replace(/\/$/, '') || '/'; }
  catch { return value.replace(/\/$/, '') || '/'; }
};
const joinRoute = (base, route) => `${base.replace(/\/$/, '')}/${route.replace(/^\//, '')}`;

function metadataEntries(allContent) {
  const entries = [];
  for (const content of Object.values(allContent['docusaurus-plugin-content-docs'] ?? {})) {
    for (const version of content.loadedVersions ?? []) {
      for (const metadata of version.docs ?? []) entries.push({kind: 'wiki', metadata});
    }
  }
  for (const content of Object.values(allContent['docusaurus-plugin-content-blog'] ?? {})) {
    for (const post of content.blogPosts ?? []) entries.push({kind: 'blog', metadata: post.metadata});
  }
  return entries.filter(({metadata: m}) => !m.draft && !m.unlisted && !m.frontMatter?.draft && !m.frontMatter?.unlisted);
}

function tagSlug(tag) {
  return String(typeof tag === 'string' ? tag : tag.permalink ?? tag.slug ?? '').split('/').filter(Boolean).at(-1) ?? '';
}

function authorSource(source) {
  return source.replace('i18n/en/docusaurus-plugin-content-docs/current/', 'content/en/wiki/')
    .replace('i18n/en/docusaurus-plugin-content-blog/', 'content/en/blog/');
}

async function buildNetwork(context, allContent) {
  const {marked} = await import('marked');
  const {siteDir, siteConfig, i18n} = context;
  const locale = i18n.currentLocale;
  const base = siteConfig.baseUrl;
  const registry = yaml.load(fs.readFileSync(path.join(siteDir, 'data/tags.yml'), 'utf8')).tags;
  const entries = metadataEntries(allContent).map(({kind, metadata: m}) => {
    const source = m.source.replace(/^@site\//, '');
    const authored = authorSource(source);
    const fallback = locale === 'en' && kind === 'wiki' && !fs.existsSync(path.join(siteDir, authored));
    const tags = [...new Set((m.tags ?? []).map(tagSlug).filter(Boolean))];
    for (const tag of tags) {
      if (!registry[tag]?.label?.[locale]) throw new Error(`Unregistered ${locale} tag '${tag}' in ${source}`);
    }
    return {
      id: `${kind}:${m.permalink}`, kind, title: m.title, description: m.description ?? '',
      path: m.permalink, source, authored, tags, date: String(m.date ?? '').slice(0, 10),
      group: kind === 'blog' ? 'blog' : (m.sourceDirName === '.' ? 'home' : m.sourceDirName?.split('/')[0]) || 'home',
      koreanFallback: fallback,
      koreanPath: fallback ? m.permalink.replace(base, base.replace(/en\/$/, '')) : undefined,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const byRoute = new Map();
  const bySource = new Map();
  for (const entry of entries) {
    const route = cleanPath(entry.path);
    if (byRoute.has(route)) throw new Error(`Duplicate content route: ${route}`);
    byRoute.set(route, entry);
    bySource.set(path.resolve(siteDir, entry.source), entry);
    bySource.set(path.resolve(siteDir, entry.authored), entry);
  }
  const origin = new URL(siteConfig.url).origin;
  const unresolved = [];
  function resolveLink(entry, href) {
    if (!href || href.startsWith('#') || /^(?:mailto|tel|data|javascript):/i.test(href)) return;
    const pathname = href.split(/[?#]/, 1)[0];
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { return; }
    if (!/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(pathname)) {
      const target = path.resolve(siteDir, path.dirname(entry.authored), decoded);
      for (const candidate of [target, `${target}.md`, `${target}.mdx`, path.join(target, 'index.md'), path.join(target, 'index.mdx')]) {
        if (bySource.has(candidate)) return bySource.get(candidate);
      }
    }
    let url;
    try { url = new URL(href, `${origin}${entry.path}`); } catch { return; }
    if (url.origin !== origin) return;
    const candidates = [url.pathname];
    if (/^\/(wiki|blog)\b/.test(url.pathname)) candidates.push(joinRoute(base, url.pathname));
    for (const candidate of candidates) {
      if (byRoute.has(cleanPath(candidate))) return byRoute.get(cleanPath(candidate));
    }
    // Only content-like links are diagnostics; assets and other site pages are not graph nodes.
    if (/\.mdx?$/.test(pathname)) unresolved.push({source: entry.path, href});
  }
  const nodes = entries.map(entry => ({...entry, incoming: 0, outgoing: 0}));
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const edges = [];
  const seen = new Set();
  function edge(source, target, kind) {
    const key = `${source}\0${target}\0${kind}`;
    if (source === target || seen.has(key)) return;
    seen.add(key); edges.push({source, target, kind});
    nodeById.get(source).outgoing++; nodeById.get(target).incoming++;
  }
  for (const entry of entries) {
    const source = fs.readFileSync(path.resolve(siteDir, entry.source), 'utf8').replace(/^---\s*\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
    marked.walkTokens(marked.lexer(source), token => {
      if (token.type !== 'link') return;
      const target = resolveLink(entry, token.href);
      if (target) edge(entry.id, target.id, 'link');
    });
    for (const slug of entry.tags) {
      const id = `tag:${slug}`;
      if (!nodeById.has(id)) {
        const node = {id, title: `#${registry[slug].label[locale]}`, path: joinRoute(base, `tags/${slug}`),
          group: 'tag', isTag: true, koreanFallback: false, incoming: 0, outgoing: 0};
        nodes.push(node); nodeById.set(id, node);
      }
      edge(entry.id, id, 'tag');
    }
  }
  // No document bodies or filesystem paths enter global browser data.
  const publicNodes = nodes.map(({source, authored, ...node}) => node);
  return {nodes: publicNodes, edges, unresolved, entries};
}

module.exports = {buildNetwork, metadataEntries, tagSlug, joinRoute, cleanPath};
