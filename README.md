<div align="center">

# jyje/profile-2

Personal site of Jeayoung Jeon (Home, Wiki, Blog, About, Resume). Docusaurus, Korean (default) and English.
Replaces the Jekyll/Hydejack site in `jyje/profile`.

[![CI](https://github.com/jyje/profile-2/actions/workflows/ci.yaml/badge.svg)](https://github.com/jyje/profile-2/actions/workflows/ci.yaml)
[![GitHub Pages](https://github.com/jyje/profile-2/actions/workflows/publish-github-pages.yaml/badge.svg)](https://github.com/jyje/profile-2/actions/workflows/publish-github-pages.yaml)

</div>

## Requirements

Use Node.js 26.0.0 or later. CI and GitHub Pages builds run on Node.js 26 to align with the project's Docusaurus v4 preparation target.

## Layout

```text
content/             Obsidian vault (open this folder in Obsidian)
├─ ko/{blog,wiki}/   Korean, the default locale, served at /
└─ en/{blog,wiki}/   English, same path and file name as the ko pair, served at /en/
data/                Resume data and home-curation.yml
scripts/             sync-content.mjs, migrate-from-jekyll.mjs
src/                 React pages (home, about, resume), remark plugin for Obsidian callouts
```

Docusaurus expects translations under `i18n/en/...`, so `scripts/sync-content.mjs` mirrors
`content/en/{blog,wiki}` into `i18n/en/` (git-ignored) before `start` and `build`.
Do not edit files under `i18n/en/docusaurus-plugin-content-*`.

## Home curation and color mode

Edit [`data/home-curation.yml`](data/home-curation.yml) to choose permanent featured pieces,
the eligible blog and wiki notes for daily selection, and how many of each to show.
IDs are paths below `content/{locale}/blog` or `content/{locale}/wiki` without `.md`.
`npm run sync` validates every choice and generates the page index from document frontmatter.
English pages link to the Korean original when a selected wiki note has no English version.

The browser selects daily items from those pools using a deterministic seed based on the
current date in Seoul. Everyone sees the same selection on the same Seoul date, and the
selection changes without rebuilding the site. Changes to the pool or featured choices
still need a site build and deployment.

Light is the default color mode. When a visitor changes it, the choice is saved in the
`jyje_color_mode` cookie and restored on later visits. Docusaurus also keeps its own
namespaced local storage value for the built-in theme switch.

## Language preference

Korean stays the default locale at `/`; English pages are under `/en/`.
The local Docusaurus plugin in `plugins/locale-preference.cjs` remembers a visitor's
navbar language choice in the `jyje_locale` cookie. Without that cookie, it uses
the browser's preferred supported language. It checks that the corresponding page
exists before moving, and leaves deliberate links within the site at their chosen
URL. The cookie is scoped to the site's base path, including project Pages previews.

This is a client-side convenience for a static GitHub Pages deployment, not an
HTTP redirect: requests and clients without JavaScript receive the page at the
requested URL. Known crawlers and automation are excluded from client routing.
Both language URLs remain available to visitors and search engines.

## GitHub Pages

The static site can run on GitHub Pages. For a project Pages preview at
`https://jyje.github.io/profile-2/`, build with:

```bash
SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
```

The default build targets `https://jyje.online/` with a root base path. The home page
constructs curated links from the configured base path, including links from English pages
to Korean wiki originals. `static/.nojekyll` is copied into the build for branch-based
publishing. A Pages source or Actions workflow and the custom domain must be configured
in repository settings before deployment; building locally does not enable Pages.

## Commands

```bash
npm install
npm run dev        # all locales with automatic rebuild and reload (port 3000, all interfaces)
npm run dev:ko     # Korean-only HMR server on port 3000
npm run dev:en     # English-only HMR server on port 3000
npm run build      # build both locales into build/
npm run serve      # serve the built site
npm run preview:lan # build and serve both locales on port 3000, all interfaces
```

`npm run dev` is the default full-site development view: `/` and `/en/` are
available together at `http://<your-LAN-IP>:3000/`. It rebuilds both locales
after source changes and reloads open pages when the build succeeds. A full
rebuild takes longer than HMR. Docusaurus can only run one locale per HMR server,
so `dev:ko` and `dev:en` remain available for faster single-locale editing.
`preview:lan` also serves both locales but does not watch for changes.
All LAN scripts bind to `0.0.0.0`, which exposes them on every active network
interface. Use them only on a trusted network.

## Authoring

See the wiki page "Obsidian authoring guide" (`content/ko/wiki/guide/obsidian-authoring.md`).
Short version: relative Markdown links (no `[[wikilinks]]`), `> [!note]` callouts, `.md` for
posts and `.mdx` only when a React component is needed.
