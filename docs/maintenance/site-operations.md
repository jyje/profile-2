# Site operations

This is the maintainer companion to the [site overview](../../README.md).
For framework changes, follow the [compatibility and upgrade policy](docusaurus-compatibility.md).
For the planned approval-gated Resume/CV portal on Raspberry Pi, see the
[private career access roadmap](../roadmap/private-career-access.md). This is
future work. The public About pages currently provide a LinkedIn inquiry gateway,
not authenticated document hosting. See [About isolation](about-access.md).

## Source of truth

| Content | Edit here |
| --- | --- |
| Blog posts and wiki notes | `content/ko/{blog,wiki}/` and their matching `content/en/{blog,wiki}/` translations |
| About overview | `src/pages/about.mdx` and `i18n/en/docusaurus-plugin-content-pages/about.mdx` |
| Portfolio and Labs page copy | Matching MDX pages under `src/pages/` and `i18n/en/docusaurus-plugin-content-pages/` |
| Resume access instructions | Localized `about/resume.mdx`, `about/cv.mdx`, and `about/selected-cv.mdx` |
| Private career facts and exports | Separate private career-application workspace; never required by this site's build |
| Homepage recommendation catalog configuration | `data/home-curation.yml` |
| Versioned non-published scaffolds and formatter | `content/_templates/v1/`, `design-system/content-contract.json` and `scripts/content-format/v1.mjs` |
| Structured content templates | One component entrypoint and CSS module per template under `src/components/ContentTemplates/` |

The site home is `/`; the About overview is `/about/`. Portfolio is public at
`/about/portfolio/`; `/about/resume/` explains how to inquire through LinkedIn.
Old Selected CV and Full CV routes contain compatibility instructions only.
Role query parameters no longer select a document. Public tags use blog/wiki
metadata, not private career records. Blog listings remain metadata-driven.

Open [content/](../../content/) as an Obsidian vault. Use relative Markdown links
instead of `[[wikilinks]]`, and `> [!note]` syntax for callouts. Use Markdown for
ordinary prose and MDX where components are needed. Validated YAML fences such as
`list-type-2x2` and `list-type-image-header` work in pages, posts, and wiki notes;
authors supply data while template CSS owns presentation. See the
[authoring guide source](../../content/ko/wiki/_guide/obsidian-authoring.md)
and [authoring rules](../../AGENTS.md).

Synchronization stages Korean sources in `.content-build/` and mirrors English
blog/wiki content into Docusaurus's `i18n/en/` content-plugin directories. Do not
edit those generated outputs or `src/generated/`. English page MDX files and
theme translation JSON are authored sources, not disposable mirrors.
The [wiki maintenance guide](wiki-content.md) covers graph metadata, shared tags,
emoji titles, canonical routes, and Git-derived modification dates.

## Local development

Use [.nvmrc](../../.nvmrc), currently Node 26.10.0, and install the lockfile with
`npm ci`. CI and Pages currently select Node major 26; that is a project choice,
not a claim about Docusaurus's minimum Node requirement.

| Command | Behavior |
| --- | --- |
| `npm run dev` | Both locales, automatic rebuild/reload, all interfaces on port 3000; includes development-only content |
| `npm run dev:ko` / `npm run dev:en` | Single-locale HMR on port 3000; includes development-only content |
| `npm start` | Standard single-locale Docusaurus development entrypoint; includes development-only content |
| `npm run preview:lan` | Build and serve both locales on all interfaces, port 3000; development content included, no file watching |
| `npm run build` | Build both locales into `build/`; public content by default |
| `npm run serve` | Serve an existing build without rebuilding or watching |
| `npm run sync` | Validate and regenerate staged content and curation in the selected content mode |

Use `npm run dev` for the normal full-site view. It serves the last successful
build while rebuilding both locales and reloads browsers after success. It is
slower than HMR. Docusaurus's HMR server handles one locale at a time.

Do not run multiple entrypoints on port 3000. Single-locale HMR shares staging
with public build/typecheck, so stop that HMR process before those checks. The
all-locale workflow serializes its builds and serves separate output slots.
LAN entrypoints expose the site on every active interface; use trusted networks
only and never treat the development server as an access-control boundary.

Labs runs independently. Follow [Vue Labs integration](../../src/components/FederatedLabs/INTEGRATION.md)
for port 5174, local remote-entry selection, and production configuration.
An unconfigured or unavailable remote displays a fallback, not a working AI backend.

## Home page, retained curation, and preferences

The shared navbar order is Blog, Wiki, Labs, About in both locales and the native
mobile menu. About retains Overview, Portfolio, Resume. Configure the order in
`docusaurus.config.ts`, not in theme wrappers or translation files. The homepage's
grouped quick links are separate from this navbar order.
`scripts/verify-navbar-order.mjs` checks both locales, desktop and mobile ordering,
and the native About submenu as part of built-site verification.

The current home page contains an introduction, grouped icon navigation and
date-based recommendations with a refresh control. Localized copy lives in
`src/pages/index.tsx`; it consumes generated `curation.json` and daily-curation
utilities. The separate navbar order does not reorder these authored quick-link
groups. `npm run sync` validates [home-curation.yml](../../data/home-curation.yml)
and regenerates the recommendation catalog. IDs are source-relative locale
blog/wiki paths without `.md`; blog IDs retain the date prefix.

Use the [design-system commands and pre-commit gate](design-system.md) to format
canonical sources and create new documents. Never edit generated curation or
locale mirrors directly.

Light is the default theme. `jyje_color_mode` remembers a visitor's selection;
Docusaurus also maintains its own namespaced local-storage preference.

Korean is the default locale at the site's base path; English adds `en/`.
The locale-preference plugin remembers navbar language selection in `jyje_locale`,
scoped to the deployment base path. Without a valid cookie it chooses a supported
browser language, falling back to Korean. It checks the counterpart with a HEAD
request before changing location, preserves query/hash, and leaves same-origin
referrer navigation at its selected URL. Known crawler and automation user agents
and `navigator.webdriver` skip this convenience behavior.

This is client-side routing, not an HTTP redirect. API clients and visitors
without JavaScript receive the requested URL. Missing English wiki translations
are staged with Korean text/assets and an English browser-translation notice;
authored English translations and Korean originals are not overwritten. This
fallback is not a promise to translate all blog posts or page types automatically.

## Publication boundary

[.docignore](../../.docignore) contains root-relative `content/` exclusion globs.
The current rules exclude wiki `_guide/` and `_design/` and blog `_internal/` in
both locales. Development staging drops the section's leading underscore in
routes, so local guide and design URLs remain `/wiki/guide/` and `/wiki/design/`.
Ignored documents receive a localized publication-warning callout before any
English fallback notice. Do not copy generated warnings into source documents.

`npm run build` defaults to `SITE_CONTENT_MODE=public`; CI and Pages explicitly
set it. Development entrypoints opt into `SITE_CONTENT_MODE=development`.
Exclusions happen before Docusaurus metadata is created, removing matched pages
and colocated assets from public routes, navigation, search, graphs, tags,
sitemaps, and generated content indexes. Public documents must not link to them.

The policy supports `#` comments, root-relative globs, and trailing-slash directory
rules, but not negation. Missing or invalid policy fails the build. Never edit
generated mirrors to implement exclusions. This is a publication boundary, not
secrecy: the source remains readable in this public Git repository.

## Build and publish

For the current project Pages deployment:

```bash
SITE_CONTENT_MODE=public SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
```

The current public site is [profile-2 on GitHub Pages](https://jyje.github.io/profile-2/).
Configuration defaults to `https://jyje.online/` and `/` when those variables are
absent; that does not move the custom domain or replace its existing site.
Keep the README's visitor links pointed at the deployment that actually serves
this repository until a separately approved domain migration is verified.

[Publish GitHub Pages](../../.github/workflows/publish-github-pages.yaml) runs on
pushes to `main` and manual dispatch. It reads the origin/base path from Pages
configuration, builds public content, verifies publication, and uploads/deploys
the artifact. Required Pages repository settings are separate from local builds.
`static/.nojekyll` also supports branch-based static hosting, but the current
workflow uses Pages artifacts. Do not replace it with `npm run deploy` implicitly.

Directory-index HTML and `trailingSlash: true` support canonical directory URLs.
Check both slash and slashless forms with `test:publication`, including initial
HTTP status without JavaScript; client navigation is not proof of static routing.

## Verification and career exports

Career exports are private-workspace responsibilities, not public-site commands.
The heading is retained for existing maintenance links.

After `npm ci`, run the following sequentially in a free worktree, without a
single-locale HMR process sharing its staging directories:

```bash
npm run typecheck
npm run test:ui
npm run test:content
SITE_CONTENT_MODE=public SITE_URL=https://jyje.github.io SITE_BASE_URL=/profile-2/ npm run build
npx playwright install chromium
npm run test:publication
node scripts/verify-built-site.mjs
npm run test:wiki
npm run test:breadcrumbs
npm run test:homepage
```

Linux runners may need `npx playwright install --with-deps chromium`, as CI uses.
`verify-built-site.mjs` checks public navigation, localized About instructions,
compatibility routes, keyboard/touch behavior, and responsive light/dark screens.
`test:publication` also scans output for retired career payloads. The public CI
must not export or upload private PDFs. In the private workspace, preserve the
one-page A4 Resume and multi-page Full CV requirements and inspect every changed
PDF page. No private document layout is changed by this site migration.

Run `npm run test:labs-breadcrumbs` separately against an all-locale development
host configured for the local remote. It intercepts remote loading with fixtures;
also inspect the actual Vue app. See the [breadcrumb verification record](breadcrumbs.md).
Framework upgrades additionally require the [compatibility checklist](docusaurus-compatibility.md#verification-gates).
