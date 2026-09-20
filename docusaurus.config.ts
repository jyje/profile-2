import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import obsidianCallouts from './src/remark/obsidian-callouts.mjs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'jyje',
  tagline: 'AI Platform Engineer',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://jyje.online',
  baseUrl: '/',

  organizationName: 'jyje',
  projectName: 'profile-2',

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
          sidebarPath: './sidebars.ts',
          beforeDefaultRemarkPlugins: [obsidianCallouts],
        },
        blog: {
          path: 'content/ko/blog',
          routeBasePath: 'blog',
          blogSidebarCount: 'ALL',
          blogSidebarTitle: 'Posts',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'ignore',
          beforeDefaultRemarkPlugins: [obsidianCallouts],
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Keep the Hydejack-era URLs (jyje/profile) working.
        // Each locale is built separately and paths are relative to that locale's baseUrl:
        // ko -> /ko/posts/x (old) ; en -> /posts/x (written under /en/), matching the old /en/posts/x.
        createRedirects(existingPath: string) {
          const isEn = process.env.DOCUSAURUS_CURRENT_LOCALE === 'en';
          const legacy = isEn ? '' : '/ko';
          if (existingPath === '/') return isEn ? undefined : ['/ko'];
          if (existingPath === '/blog') return [`${legacy}/posts`];
          const post = existingPath.match(/^\/blog\/(?!tags\/|page\/|archive|authors)([^/]+)$/);
          if (post) return [`${legacy}/posts/${post[1]}`];
          if (isEn) return undefined;
          if (existingPath === '/resume') return ['/ko/resume'];
          if (existingPath === '/portfolio') return ['/ko/portfolio'];
          const tag = existingPath.match(/^\/blog\/tags\/([^/]+)$/);
          if (tag) return [`/tags/${tag[1]}`];
          return undefined;
        },
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'jyje',
      logo: {
        alt: 'jyje',
        src: 'img/logo.svg',
      },
      items: [
        {type: 'docSidebar', sidebarId: 'wikiSidebar', position: 'left', label: 'Wiki'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {to: '/resume', label: 'Resume', position: 'left'},
        {type: 'localeDropdown', position: 'right'},
        {href: 'https://github.com/jyje', label: 'GitHub', position: 'right'},
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
