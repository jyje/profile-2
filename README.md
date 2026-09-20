# profile-2

Personal site of Jeayoung Jeon (Wiki, Blog, Resume). Docusaurus, Korean (default) and English.
Replaces the Jekyll/Hydejack site in `jyje/profile`.

## Layout

```text
content/             Obsidian vault (open this folder in Obsidian)
├─ ko/{blog,wiki}/   Korean, the default locale, served at /
└─ en/{blog,wiki}/   English, same path and file name as the ko pair, served at /en/
data/                Resume data (resume.{ko,en}.yml)
scripts/             sync-content.mjs, migrate-from-jekyll.mjs
src/                 React pages (home, resume), remark plugin for Obsidian callouts
```

Docusaurus expects translations under `i18n/en/...`, so `scripts/sync-content.mjs` mirrors
`content/en/{blog,wiki}` into `i18n/en/` (git-ignored) before `start` and `build`.
Do not edit files under `i18n/en/docusaurus-plugin-content-*`.

## Commands

```bash
npm install
npm run dev        # Korean site with content/en watcher (http://localhost:3000)
npm run dev:en     # English site
npm run build      # build both locales into build/
npm run serve      # serve the built site
```

## Authoring

See the wiki page "Obsidian authoring guide" (`content/ko/wiki/guide/obsidian-authoring.md`).
Short version: relative Markdown links (no `[[wikilinks]]`), `> [!note]` callouts, `.md` for
posts and `.mdx` only when a React component is needed.
