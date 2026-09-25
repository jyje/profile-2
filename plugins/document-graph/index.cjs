const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

function walkMarkdown(root, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    if (entry.name.startsWith('.')) continue;
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) walkMarkdown(absolute, files);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
  }
  return files;
}

function splitFrontmatter(source) {
  const match = source.match(/^(---\s*\r?\n[\s\S]*?\r?\n---\s*)(?:\r?\n|$)/);
  if (!match) return {data: {}, body: source};
  const raw = match[1].replace(/^---\s*\r?\n/, '').replace(/\r?\n---\s*$/, '');
  return {data: yaml.load(raw) ?? {}, body: source.slice(match[0].length)};
}

function documentPath(relative, slug) {
  if (typeof slug === 'string' && slug.trim() === '/') return '/wiki';
  const withoutExtension = relative.replace(/\.md$/, '');
  const routePart = withoutExtension === 'index'
    ? ''
    : withoutExtension.endsWith('/index')
      ? withoutExtension.slice(0, -'/index'.length)
      : withoutExtension;
  if (typeof slug === 'string' && slug.trim()) {
    const normalizedSlug = slug.trim().replace(/^\/+|\/+$/g, '');
    return normalizedSlug ? `/wiki/${normalizedSlug}` : '/wiki';
  }
  return routePart ? `/wiki/${routePart}` : '/wiki';
}

function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((tag) => {
    if (typeof tag === 'string') return tag.trim().replace(/^#/, '');
    if (tag && typeof tag === 'object') {
      const label = tag.label ?? tag.name ?? tag.value;
      return typeof label === 'string' ? label.trim().replace(/^#/, '') : '';
    }
    return '';
  }).filter(Boolean))];
}

function resolveTarget(sourceRelative, href, docs) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(href)) return undefined;
  let pathname = href.split(/[?#]/, 1)[0];
  if (!pathname) return undefined;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Keep malformed URIs encoded so they simply fail to match a document.
  }
  const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(sourceRelative), pathname));
  if (normalized === '..' || normalized.startsWith('../')) return undefined;
  const candidates = path.posix.extname(normalized)
    ? [normalized]
    : [`${normalized}.md`, path.posix.join(normalized, 'index.md')];
  return candidates.find((candidate) => docs.has(candidate));
}

async function readDocs(root) {
  const {marked} = await import('marked');
  const docs = new Map();
  for (const absolute of walkMarkdown(root)) {
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const source = fs.readFileSync(absolute, 'utf8');
    const {data, body} = splitFrontmatter(source);
    if (data.unlisted === true) continue;
    docs.set(relative, {
      relative,
      title: String(data.title ?? path.basename(relative, '.md')),
      slug: data.slug,
      tags: normalizeTags(data.tags),
      body,
      absolute,
    });
  }

  const markdownLinks = new Map();
  for (const doc of docs.values()) {
    const links = [];
    function visit(value) {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (value.type === 'link' && typeof value.href === 'string') links.push(value.href);
      Object.values(value).forEach(visit);
    }
    visit(marked.lexer(doc.body));
    markdownLinks.set(doc.relative, links);
  }
  return {docs, markdownLinks};
}

function createGraph({docs, markdownLinks}, {fallbackPaths = new Set(), koreanDocs = new Map()} = {}) {
  const nodes = [...docs.values()].map((doc) => ({
    id: doc.relative,
    title: doc.title,
    path: documentPath(doc.relative, doc.slug),
    group: doc.relative.includes('/') ? doc.relative.split('/')[0] : 'home',
    koreanFallback: fallbackPaths.has(doc.relative),
    koreanPath: fallbackPaths.has(doc.relative) ? documentPath(doc.relative, koreanDocs.get(doc.relative)?.slug) : undefined,
    incoming: 0,
    outgoing: 0,
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeKeys = new Set();
  const edges = [];

  function addEdge(source, target) {
    const key = `${source}\0${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({source, target});
    nodeById.get(source).outgoing += 1;
    nodeById.get(target).incoming += 1;
  }

  for (const doc of docs.values()) {
    for (const href of markdownLinks.get(doc.relative) ?? []) {
      const target = resolveTarget(doc.relative, href, docs);
      if (target && target !== doc.relative) addEdge(doc.relative, target);
    }
  }

  const tagNodes = new Map();
  for (const doc of docs.values()) {
    const node = nodeById.get(doc.relative);
    for (const tag of doc.tags) {
      const id = `tags/${tag}`;
      if (!tagNodes.has(id)) {
        const tagNode = {
          id,
          title: `#${tag}`,
          group: 'tag',
          isTag: true,
          koreanFallback: false,
          incoming: 0,
          outgoing: 0,
        };
        tagNodes.set(id, tagNode);
        nodes.push(tagNode);
        nodeById.set(id, tagNode);
      }
      addEdge(node.id, id);
    }
  }

  return {nodes, edges};
}

module.exports = function documentGraphPlugin(context, userOptions = {}) {
  const options = {
    defaultDocsPath: 'content/ko/wiki',
    englishDocsPath: 'content/en/wiki',
    translatedDocsPath: 'docusaurus-plugin-content-docs/current',
    koreanDocsPath: 'content/ko/wiki',
    ...userOptions,
  };
  const {siteDir, i18n} = context;
  const locale = i18n.currentLocale;
  const defaultLocale = i18n.defaultLocale;
  const docsRoot = locale === defaultLocale
    ? path.resolve(siteDir, options.defaultDocsPath)
    : path.resolve(context.localizationDir, options.translatedDocsPath);

  return {
    name: 'docusaurus-plugin-document-graph',

    getPathsToWatch() {
      const watched = [`${docsRoot}/**/*.md`];
      if (locale === 'en') {
        watched.push(`${path.resolve(siteDir, options.englishDocsPath)}/**/*.md`);
        watched.push(`${path.resolve(siteDir, options.koreanDocsPath)}/**/*.md`);
      }
      return watched;
    },

    async loadContent() {
      const localized = await readDocs(docsRoot);
      if (locale !== 'en') return createGraph(localized);

      const authoredRoot = path.resolve(siteDir, options.englishDocsPath);
      const authored = new Set(walkMarkdown(authoredRoot).map((file) => path.relative(authoredRoot, file)));
      const fallbackPaths = new Set([...localized.docs.keys()].filter((relative) => !authored.has(relative)));
      const korean = await readDocs(path.resolve(siteDir, options.koreanDocsPath));
      return createGraph(localized, {fallbackPaths, koreanDocs: korean.docs});
    },

    async contentLoaded({content, actions}) {
      await actions.createData('graph.json', content);
    },
  };
};
