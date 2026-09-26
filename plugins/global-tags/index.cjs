const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const {buildNetwork} = require('../content-network.cjs');

function normalizedTags(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(tag => typeof tag === 'string'))];
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
        route: `/about/cv#${section}-${index}`,
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

async function buildTagData(context, allContent) {
  const {siteDir, i18n: {currentLocale: locale}} = context;
  const registry = yaml.load(fs.readFileSync(path.join(siteDir, 'data/tags.yml'), 'utf8'))?.tags ?? {};
  const network = await buildNetwork(context, allContent);
  const entries = [
    ...network.entries.filter(entry => entry.tags.length).map(entry => ({
      ...entry, route: entry.path,
      kind: entry.kind === 'wiki' && /(?:^|\/)portfolio(?:\/|\.)/.test(entry.source) ? 'portfolio' : entry.kind,
    })),
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
      items: tagItems.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, locale))
        .map(({source, authored, ...entry}) => entry),
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
        path.join(siteDir, `content/${locale}/blog/**/*.{md,mdx}`),
        path.join(siteDir, locale === 'en' ? 'i18n/en/docusaurus-plugin-content-docs/current/**/*.{md,mdx}' : 'content/ko/wiki/**/*.{md,mdx}'),
      ];
    },

    async allContentLoaded({allContent, actions}) {
      const content = await buildTagData(context, allContent);
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
