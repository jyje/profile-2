const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

function walkMarkdown(root, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, {withFileTypes: true})) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) walkMarkdown(file, files);
    else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) files.push(file);
  }
  return files;
}

function frontMatter(source) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? yaml.load(match[1]) ?? {} : {};
}

function normalizeTag(tag) {
  if (typeof tag === 'string') return tag.trim().replace(/^#/, '');
  if (tag && typeof tag === 'object') {
    return String(tag.slug ?? tag.permalink ?? tag.label ?? tag.name ?? '').trim().replace(/^#|^\//, '');
  }
  return '';
}

function normalizedTags(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(normalizeTag).filter(Boolean))];
}

function routeForWiki(relativePath, slug) {
  if (typeof slug === 'string' && slug.trim()) {
    const normalized = slug.trim().replace(/^\/+|\/+$/g, '');
    if (normalized === 'wiki') return '/wiki';
    return normalized.startsWith('wiki/') ? `/${normalized}` : `/wiki/${normalized}`;
  }
  let route = relativePath.replace(/\.mdx?$/i, '').replace(/(^|\/)index$/, '');
  return route ? `/wiki/${route}` : '/wiki';
}

function blogDate(relativePath, metadata) {
  const value = metadata.date ?? relativePath.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function contentEntries({root, kind, locale, authoredRoot}) {
  return walkMarkdown(root).flatMap((file) => {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const metadata = frontMatter(fs.readFileSync(file, 'utf8'));
    if (metadata.draft === true || metadata.unlisted === true || metadata.tags == null) return [];
    const tags = normalizedTags(metadata.tags);
    if (!tags.length) return [];
    const isBlog = kind === 'blog';
    const filename = path.basename(relative).replace(/\.mdx?$/i, '');
    const blogSlug = String(metadata.slug ?? filename.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
    const route = isBlog ? `/blog/${blogSlug.replace(/^\/+/, '')}` : routeForWiki(relative, metadata.slug);
    const portfolio = !isBlog && /(^|\/)portfolio(\/|$)/i.test(relative);
    const koreanFallback = locale === 'en' && kind === 'wiki' && authoredRoot && !fs.existsSync(path.join(authoredRoot, relative));
    return [{
      kind: portfolio ? 'portfolio' : kind,
      title: String(metadata.title ?? filename),
      description: String(metadata.description ?? '').replace(/<[^>]*>/g, '').trim(),
      date: isBlog ? blogDate(relative, metadata) : '',
      route,
      tags,
      locale,
      koreanFallback,
      source: relative,
    }];
  });
}

function resumeEntries(siteDir, locale) {
  const file = path.join(siteDir, `data/resume.${locale}.yml`);
  const resume = yaml.load(fs.readFileSync(file, 'utf8')) ?? {};
  const sections = [
    ['work', 'work'],
    ['projects', 'projects'],
    ['education', 'education'],
    ['skills', 'skills'],
  ];
  const entries = [];
  for (const [section, key] of sections) {
    for (const [index, item] of (resume[key] ?? []).entries()) {
      const tags = normalizedTags(item.tags);
      if (!tags.length) continue;
      const title = section === 'work'
        ? `${item.company}: ${item.position}`
        : section === 'education'
          ? item.institution
          : section === 'skills'
            ? item.name
            : item.position;
      const description = section === 'skills'
        ? (item.keywords ?? []).join(', ')
        : String(item.area ?? item.roles?.description ?? '').trim();
      entries.push({
        kind: 'resume',
        title: String(title ?? key),
        description,
        date: String(item.startDate ?? '').slice(0, 10),
        route: '/resume',
        tags,
        locale,
        source: `data/resume.${locale}.yml#${section}-${index}`,
      });
    }
  }
  return entries;
}

function localized(value, locale) {
  if (value && typeof value === 'object') return String(value[locale] ?? value.en ?? value.ko ?? '');
  return typeof value === 'string' ? value : '';
}

function buildTagData(siteDir, locale) {
  const registry = yaml.load(fs.readFileSync(path.join(siteDir, 'data/tags.yml'), 'utf8'))?.tags ?? {};
  const blogRoot = path.join(siteDir, `content/${locale}/blog`);
  const wikiRoot = locale === 'en'
    ? path.join(siteDir, 'i18n/en/docusaurus-plugin-content-docs/current')
    : path.join(siteDir, 'content/ko/wiki');
  const authoredWikiRoot = locale === 'en' ? path.join(siteDir, 'content/en/wiki') : undefined;
  const entries = [
    ...contentEntries({root: blogRoot, kind: 'blog', locale}),
    ...contentEntries({root: wikiRoot, kind: 'wiki', locale, authoredRoot: authoredWikiRoot}),
    ...resumeEntries(siteDir, locale),
  ];

  for (const entry of entries) {
    for (const slug of entry.tags) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`Global tag must use kebab-case: ${slug} in ${entry.source}`);
      }
      if (!registry[slug]?.label?.[locale]) {
        throw new Error(`Missing ${locale} label for global tag '${slug}' in ${entry.source}; add it to data/tags.yml`);
      }
    }
  }

  const usedTags = new Set(entries.flatMap((entry) => entry.tags));
  const tags = [...usedTags].sort((a, b) => localized(registry[a]?.label, locale).localeCompare(localized(registry[b]?.label, locale), locale)).map((slug) => {
    const tagItems = entries.filter((entry) => entry.tags.includes(slug));
    return {
      slug,
      label: localized(registry[slug].label, locale),
      description: localized(registry[slug].description, locale),
      count: tagItems.length,
      items: tagItems.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, locale)),
    };
  });

  return {
    locale,
    title: locale === 'ko' ? '태그' : 'Tags',
    tagList: tags,
  };
}

function siteRoute(baseUrl, relativePath) {
  const base = String(baseUrl ?? '/').replace(/\/+$/, '');
  return `${base}/${relativePath.replace(/^\/+/, '')}` || '/';
}

module.exports = function globalTagsPlugin(context) {
  const {siteDir, siteConfig, i18n} = context;
  const locale = i18n.currentLocale;
  const component = path.resolve(siteDir, 'src/components/GlobalTags/index.tsx');

  return {
    name: 'docusaurus-plugin-global-tags',

    getPathsToWatch() {
      return [
        path.join(siteDir, 'data/tags.yml'),
        path.join(siteDir, `data/resume.${locale}.yml`),
        path.join(siteDir, `content/${locale}/blog/**/*.md`),
        path.join(siteDir, locale === 'en' ? 'i18n/en/docusaurus-plugin-content-docs/current/**/*.md' : 'content/ko/wiki/**/*.md'),
      ];
    },

    async loadContent() {
      return buildTagData(siteDir, locale);
    },

    async contentLoaded({content, actions}) {
      const dataPath = await actions.createData(`global-tags-${locale}.json`, content);
      actions.addRoute({
        path: siteRoute(siteConfig.baseUrl, 'tags'),
        component,
        exact: true,
        modules: {data: dataPath},
        props: {locale, slug: null},
      });
      for (const tag of content.tagList) {
        actions.addRoute({
          path: siteRoute(siteConfig.baseUrl, `tags/${tag.slug}`),
          component,
          exact: true,
          modules: {data: dataPath},
          props: {locale, slug: tag.slug},
        });
      }
    },
  };
};
