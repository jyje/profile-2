---
title: Development documents and public deployment
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

## Verification

```sh
npm run test:content
SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
npm run test:publication
```

Markdown sources in the public Git repository remain public. This policy controls site publication, not authentication or secret storage.
