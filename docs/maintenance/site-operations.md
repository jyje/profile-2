# Site operations

This is the maintainer companion to the [site overview](../../README.md).
For framework changes, follow the [compatibility and upgrade policy](docusaurus-compatibility.md).

## Source of truth

| Content | Edit here |
| --- | --- |
| Blog posts and wiki notes | `content/ko/{blog,wiki}/` and their matching `content/en/{blog,wiki}/` translations |
| About overview | `src/pages/about.mdx` and `i18n/en/docusaurus-plugin-content-pages/about.mdx` |
| Portfolio and Labs page copy | Matching MDX pages under `src/pages/` and `i18n/en/docusaurus-plugin-content-pages/` |
| Career facts | `data/resume.ko.yml` and `data/resume.en.yml` |
| One-page resume selection | `data/career-layout.yml` |
| Retained curation configuration, not displayed on the home page | `data/home-curation.yml` |
| Structured content templates | One component entrypoint and CSS module per template under `src/components/ContentTemplates/` |

The site home is `/`; the About overview is `/about/`. Resume, CV, and portfolio
are separate pages under `/about/`. Blog listings are generated from post metadata,
not a second hand-maintained list. Resume/CV pages render the shared career data.

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

The current home page contains an introduction and four text links to Blog, Wiki,
Labs, and About. Its localized copy lives in `src/pages/index.tsx`. It does not
render featured pieces, a reading list, or daily picks.

[home-curation.yml](../../data/home-curation.yml), the catalog generator, and the
daily-selection utility are retained but have no consumer on the current home
page. Editing that configuration does not change the visible homepage.
`npm run sync` still validates it and generates the catalog, so referenced sources
must remain valid until that build-time dependency is explicitly removed.
IDs are source-relative paths under each locale's blog/wiki without `.md`; blog
IDs retain the date prefix. Reintroducing curated content requires an explicit
UI change rather than a configuration-only edit.

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
`verify-built-site.mjs` serves that project-path build and exports both locales'
career PDFs. With an already running all-locale server, `npm run export:pdf`
exports from `http://127.0.0.1:3000/`; `PDF_BASE_URL` can select another served
base URL, including `/profile-2/`. Merely building does not start that server.

PDF outputs live in ignored `output/pdf/`. The summary must be exactly one A4
page; the CV must remain multi-page. Render and inspect every page for clipping,
font loading, skill-chip wrapping, and hidden navigation/breadcrumbs. Automated
counts are not a substitute for visual review. Do not silently truncate facts or
shrink text to satisfy page counts.

Run `npm run test:labs-breadcrumbs` separately against an all-locale development
host configured for the local remote. It intercepts remote loading with fixtures;
also inspect the actual Vue app. See the [breadcrumb verification record](breadcrumbs.md).
Framework upgrades additionally require the [compatibility checklist](docusaurus-compatibility.md#verification-gates).
