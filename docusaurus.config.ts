import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import obsidianCallouts from './src/remark/obsidian-callouts.mjs';
import contentTemplateBlocks from './plugins/content-templates/remark-plugin.cjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'jyje',
  tagline: 'AI Platform Engineer',
  favicon: 'img/favicon-32.png',

  future: {
    v4: true,
  },

  // GitHub Pages builds set SITE_URL and SITE_BASE_URL to publish under /profile-2/.
  // Local and jyje.online builds keep their existing root URL by default.
  url: process.env.SITE_URL ?? 'https://jyje.online',
  baseUrl: process.env.SITE_BASE_URL ?? '/',
  customFields: {
    // Deployment-controlled remote only. Never accept a remote URL from visitors.
    labsRemoteEntry: process.env.LABS_REMOTE_ENTRY ?? '',
  },

  organizationName: 'jyje',
  projectName: 'profile-2',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  // .md is CommonMark (Obsidian-friendly, raw HTML allowed); .mdx is MDX (React components).
  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // ko is the default locale (served at /), en is served at /en/.
  // en content is authored in content/en and mirrored into i18n/en by scripts/sync-content.mjs.
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    localeConfigs: {
      ko: {label: '한국어', htmlLang: 'ko-KR'},
      en: {label: 'English', htmlLang: 'en-US'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'content/ko/wiki',
          routeBasePath: 'wiki',
          tagsBasePath: '_tag-archives',
          sidebarPath: './sidebars.ts',
          beforeDefaultRemarkPlugins: [obsidianCallouts, contentTemplateBlocks],
        },
        blog: {
          path: 'content/ko/blog',
          routeBasePath: 'blog',
          blogListComponent: '@site/src/components/BlogListPage',
          tagsBasePath: '_tag-archives',
          blogSidebarCount: 'ALL',
          blogSidebarTitle: 'Posts',
          postsPerPage: 'ALL',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
          beforeDefaultRemarkPlugins: [obsidianCallouts, contentTemplateBlocks],
        },
        pages: {
          beforeDefaultRemarkPlugins: [contentTemplateBlocks],
        },
        theme: {
          customCss: ['./src/css/custom.css', './src/css/shadcn.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    './plugins/tailwind.cjs',
    './plugins/color-cookie.cjs',
    './plugins/locale-preference.cjs',
    './plugins/global-tags',
    './plugins/document-graph',
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Keep the Hydejack-era URLs (jyje/profile) working.
        // Each locale is built separately and paths are relative to that locale's baseUrl:
        // ko -> /ko/posts/x (old) ; en -> /posts/x (written under /en/), matching the old /en/posts/x.
        createRedirects(existingPath: string) {
          const isEn = process.env.DOCUSAURUS_CURRENT_LOCALE === 'en';
          const legacy = isEn ? '' : '/ko';
          const globalTag = existingPath.match(/^\/tags(?:\/([^/]+))?$/);
          if (globalTag) {
            const suffix = globalTag[1] ? `/${globalTag[1]}` : '';
            const aliases = globalTag[1] === 'kubernetes'
              ? ['k8s']
              : globalTag[1] === 'digital-twins'
                ? ['digital-twin']
                : [];
            return [
              `/blog/tags${suffix}`,
              `/wiki/tags${suffix}`,
              ...aliases.flatMap((alias) => [`/tags/${alias}`, `/blog/tags/${alias}`, `/wiki/tags/${alias}`]),
            ];
          }
          if (existingPath === '/') return isEn ? undefined : ['/ko'];
          if (existingPath === '/blog') return [`${legacy}/posts`];
          const post = existingPath.match(/^\/blog\/(?!tags\/|page\/|archive|authors)([^/]+)$/);
          if (post) return [`${legacy}/posts/${post[1]}`];
          if (existingPath === '/about') return ['/about/profile'];
          if (existingPath === '/about/resume') {
            return isEn ? ['/resume'] : ['/resume', '/ko/resume'];
          }
          if (existingPath === '/about/portfolio') {
            return isEn ? ['/portfolio'] : ['/portfolio', '/ko/portfolio'];
          }
          if (isEn) return undefined;
          return undefined;
        },
      },
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: 'filename',
        language: ['en', 'ko'],
        docsRouteBasePath: 'wiki',
        docsDir: ['content/ko/wiki', 'content/en/wiki'],
        blogRouteBasePath: 'blog',
        blogDir: ['content/ko/blog', 'content/en/blog'],
        indexPages: true,
        searchBarPosition: 'right',
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'jyje.online',
      logo: {
        alt: 'jyje.online',
        src: 'img/logo-128.png',
      },
      items: [
        {to: '/blog', label: 'Blog', position: 'left'},
        {type: 'docSidebar', sidebarId: 'wikiSidebar', position: 'left', label: 'Wiki'},
        {to: '/labs', label: 'Labs', position: 'left'},
        {
          to: '/about',
          label: 'About',
          position: 'left',
          items: [
            {to: '/about', label: 'Overview'},
            {to: '/about/resume', label: 'Resume'},
            {to: '/about/cv', label: 'CV'},
            {to: '/about/portfolio', label: 'Portfolio'},
          ],
        },
        {
          type: 'localeDropdown',
          className: 'site-locale-compact',
          position: 'right',
        },
        {
          href: 'https://github.com/jyje',
          label: 'GitHub',
          className: 'site-github-compact',
          title: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Jeayoung Jeon. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'docker', 'python', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
