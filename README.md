# profile-2

Personal site of Jeayoung Jeon (Home, Wiki, Blog, About, Resume). Docusaurus, Korean (default) and English.
Replaces the Jekyll/Hydejack site in `jyje/profile`.

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
npm run dev        # Korean site with content/en watcher (port 3000, all interfaces)
npm run dev:en     # English-only live server on port 3000
npm run build      # build both locales into build/
npm run serve      # serve the built site
npm run preview:lan # build and serve both locales on port 3000, all interfaces
```

`npm run dev` and `npm run dev:en` are live-reload servers, but Docusaurus can run
only one locale per development server. Use `npm run preview:lan` to check both
`/` and `/en/` at `http://<your-LAN-IP>:3000/`. The preview serves a production
build and does not live-reload: restart it after content or code changes.
All three LAN scripts bind to `0.0.0.0`, which exposes them on every active
network interface. Use them only on a trusted network.

## Authoring

See the wiki page "Obsidian authoring guide" (`content/ko/wiki/guide/obsidian-authoring.md`).
Short version: relative Markdown links (no `[[wikilinks]]`), `> [!note]` callouts, `.md` for
posts and `.mdx` only when a React component is needed.
