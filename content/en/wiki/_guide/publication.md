---
title: "🧭 Development documents and public deployment"
sidebar_position: 2
tags: [guide]
---

## Authoring locations

Keep local authoring guides in `content/{ko,en}/wiki/_guide/` and site design notes in `_design/`. Underscored folders remain visible in Obsidian and file browsers. Local development serves them at `/wiki/guide/` and `/wiki/design/`.

## Public deployment exclusions

The repository-root `.docignore` defines content excluded from public builds.

```text
# Apply to both Korean and English.
content/*/wiki/_guide/
content/*/wiki/_design/
content/*/blog/_internal/
```

Rules are relative to the repository root. `*` and `**` globs, `#` comment lines and trailing `/` directory rules are supported. Negation with `!` is not supported. Directory rules exclude colocated assets as well as documents.

`npm run dev` builds both locales with `SITE_CONTENT_MODE=development` for localhost and LAN use. `npm run build`, CI and GitHub Pages use `public` mode. Exclusion happens before building pages, navigation, search, graph, tags and sitemap, not through a browser hostname check.

Build inputs are generated under `.content-build/`; do not edit them. Links from public documents to excluded documents fail the build. Keep development instructions in this section. Between local-only sections, site links can use existing routes such as `/wiki/design/resume`.

Development builds automatically prepend a publication warning to excluded
documents, before any English fallback notice. Do not copy that warning into
authored Markdown. Wiki title emoji rules also apply to excluded documents.

## Last updated dates

Wiki documents and blog posts use Docusaurus's built-in last-updated footer. Staging reads the authored file's last Git commit, not build time or filesystem mtime. English fallback pages inherit the Korean source date. Uncommitted edits do not advance the date; new documents without Git history have no inferred date until committed.

An explicit source front-matter date takes precedence:

```yaml
last_update:
  date: '2026-09-27T09:00:00+09:00'
```

The standard Docusaurus renderer formats dates in UTC using the page locale. CI requires full history (`fetch-depth: 0`). Never edit dates in generated staging or locale mirrors.

## Verification

```sh
npm run test:content
SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
npm run test:publication
```

Markdown sources in the public Git repository remain public. This policy controls site publication, not authentication or secret storage.
