const fs = require('node:fs/promises');
const path = require('node:path');

const DUMMY_ORIGIN = 'https://docusaurus.invalid';

function pathname(value, origin = DUMMY_ORIGIN) {
  try {
    return new URL(value, origin).pathname;
  } catch {
    return undefined;
  }
}

function relativeRoute(route, baseUrl, origin) {
  const routePath = pathname(route, origin);
  const basePath = pathname(baseUrl, origin);
  if (!routePath || !basePath) return undefined;

  const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`;
  if (routePath === basePath || routePath === prefix) return '';
  if (!routePath.startsWith(prefix)) return undefined;
  return routePath.slice(prefix.length);
}

function outputHtmlPath(outDir, relative) {
  const raw = relative.replace(/^\/+/, '').replace(/\/+$/, '');
  const decoded = (() => {
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();
  const variants = [...new Set([raw, decoded])];
  const candidates = [];

  for (const variant of variants) {
    const segments = variant.split('/').filter(Boolean);
    if (segments.some(segment => segment === '.' || segment === '..')) continue;
    if (variant.endsWith('.html')) candidates.push(path.join(outDir, ...segments));
    if (!variant) candidates.push(path.join(outDir, 'index.html'));
    else {
      candidates.push(path.join(outDir, ...segments, 'index.html'));
      candidates.push(path.join(outDir, ...segments) + '.html');
    }
  }

  const outputRoot = path.resolve(outDir);
  return candidates.map(candidate => path.resolve(candidate))
    .find(candidate => candidate.startsWith(`${outputRoot}${path.sep}`));
}

function decodeHtml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|ndash|mdash|rsquo|lsquo|rdquo|ldquo|hellip);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key === 'amp') return '&';
    if (key === 'quot') return '"';
    if (key === 'apos') return "'";
    if (key === 'lt') return '<';
    if (key === 'gt') return '>';
    if (key === 'nbsp') return ' ';
    if (key === 'ndash' || key === 'mdash') return '-';
    if (key === 'rsquo' || key === 'lsquo') return "'";
    if (key === 'rdquo' || key === 'ldquo') return '"';
    if (key === 'hellip') return '...';
    const number = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
    try { return Number.isFinite(number) ? String.fromCodePoint(number) : match; }
    catch { return match; }
  });
}

function attribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? decodeHtml(match[2]) : '';
}

function htmlMetadata(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html.slice(0, 20000);
  const title = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const descriptionTag = (head.match(/<meta\b[^>]*>/gi) ?? [])
    .find(tag => attribute(tag, 'name').toLowerCase() === 'description');
  return {
    title: decodeHtml(title.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim(),
    description: (attribute(descriptionTag ?? '', 'content') || '').replace(/\s+/g, ' ').trim(),
  };
}

function routeTitle(relative, locale) {
  if (!relative) return locale === 'ko' ? '홈' : 'Home';
  const slug = relative.replace(/\/+$/, '').split('/').at(-1) ?? relative;
  return decodeHtml(slug.replace(/[-_]+/g, ' '));
}

function escapeLinkText(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function groupFor(relative) {
  const first = relative.split('/').filter(Boolean)[0] ?? '';
  if (first === 'wiki') return 'wiki';
  if (first === 'blog' || first === 'posts') return 'blog';
  if (first === 'tags') return 'tags';
  if (['about', 'resume', 'portfolio', 'cv'].includes(first)) return 'profile';
  return 'pages';
}

function groupTitle(group, locale) {
  const titles = {
    ko: {profile: '프로필', blog: '블로그', wiki: '위키', tags: '태그', pages: '사이트 페이지'},
    en: {profile: 'Profile', blog: 'Blog', wiki: 'Wiki', tags: 'Tags', pages: 'Site pages'},
  };
  return (titles[locale] ?? titles.en)[group];
}

function llmsUrl(baseUrl, siteUrl) {
  return new URL('llms.txt', new URL(baseUrl, siteUrl)).pathname;
}

function isNoIndex(route, routesBuildMetadata, siteUrl) {
  const normalize = value => (pathname(value, siteUrl)?.replace(/\/+$/, '') || '/');
  const targetPath = normalize(route);
  return Object.entries(routesBuildMetadata ?? {}).some(([key, metadata]) =>
    metadata?.noIndex === true && normalize(key) === targetPath);
}

async function readRouteMetadata(outDir, relative) {
  const htmlPath = outputHtmlPath(outDir, relative);
  if (!htmlPath) return {};
  try {
    return htmlMetadata(await fs.readFile(htmlPath, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = function llmsTxtPlugin({siteConfig, i18n}) {
  const locale = i18n.currentLocale;
  const indexPath = llmsUrl(siteConfig.baseUrl, siteConfig.url);

  return {
    name: 'docusaurus-plugin-llms-txt',

    injectHtmlTags() {
      if (process.env.NODE_ENV !== 'production') return {};
      return {
        headTags: [{
          tagName: 'link',
          attributes: {rel: 'describedby', href: indexPath},
        }],
      };
    },

    async postBuild({outDir, routesPaths, routesBuildMetadata}) {
      const routes = [];
      const seen = new Set();

      for (const route of routesPaths ?? []) {
        const routePath = pathname(route, siteConfig.url);
        const relative = relativeRoute(route, siteConfig.baseUrl, siteConfig.url);
        if (!routePath || relative === undefined || /(?:^|\/)404\.html$/i.test(routePath)) continue;
        if (isNoIndex(route, routesBuildMetadata, siteConfig.url) || seen.has(routePath)) continue;
        seen.add(routePath);

        const metadata = await readRouteMetadata(outDir, relative);
        routes.push({
          group: groupFor(relative),
          title: metadata.title || routeTitle(relative, locale),
          description: metadata.description,
          url: new URL(route, siteConfig.url).href,
        });
      }

      routes.sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title, locale) || a.url.localeCompare(b.url));
      const summary = locale === 'ko'
        ? 'Jeayoung Jeon의 개인 사이트로 프로필, 이력서, 블로그, 위키 페이지를 제공합니다.'
        : 'Jeayoung Jeon’s personal site with profile, résumé, blog, and wiki pages.';
      const lines = [
        `# ${siteConfig.title}`,
        '',
        `> ${summary}`,
        '',
        locale === 'ko'
          ? '아래 링크는 이 언어에서 공개된 페이지를 모두 포함합니다.'
          : 'The links below cover all published pages in this language.',
      ];

      const groups = ['profile', 'blog', 'wiki', 'tags', 'pages'];
      for (const group of groups) {
        const entries = routes.filter(route => route.group === group);
        if (!entries.length) continue;
        lines.push('', `## ${groupTitle(group, locale)}`, '');
        for (const entry of entries) {
          const description = entry.description ? `: ${entry.description}` : '';
          lines.push(`- [${escapeLinkText(entry.title)}](${entry.url})${description}`);
        }
      }

      const otherLocales = i18n.locales.filter(other => other !== locale);
      if (otherLocales.length) {
        lines.push('', locale === 'ko' ? '## 다른 언어' : '## Other languages', '');
        for (const otherLocale of otherLocales) {
          const config = i18n.localeConfigs[otherLocale];
          if (!config?.baseUrl || !config?.url) continue;
          const label = config.label || otherLocale;
          const url = llmsUrl(config.baseUrl, config.url);
          lines.push(`- [${escapeLinkText(label)}](${new URL(url, config.url).href}): ${locale === 'ko' ? '번역된 페이지 목록' : 'Index of translated pages'}`);
        }
      }

      await fs.mkdir(outDir, {recursive: true});
      await fs.writeFile(path.join(outDir, 'llms.txt'), `${lines.join('\n')}\n`, 'utf8');
      console.log(`[llms-txt] Generated ${routes.length} public routes for ${locale} at ${path.join(outDir, 'llms.txt')}`);
    },
  };
};
