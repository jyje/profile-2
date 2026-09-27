# Unified site breadcrumbs

## Completed behavior

All site sections now use the existing wiki/Infima breadcrumb presentation.
The wiki retains its original theme components and sidebar hierarchy, with the
Wiki Home parent added to document paths and native structured data. Other
sections use `SiteBreadcrumbs`, localized metadata or MDX labels, and thin
original-theme wrappers. No theme component was ejected.

Coverage includes blog lists/posts/archives/authors/tag archives, About and its
career/portfolio pages, global tags, search, and Labs. Home and 404 pages omit
breadcrumbs. Internal Labs screens are not invented public URLs and are omitted
from SEO structured data. Public breadcrumbs respect the locale and base URL.
Print styles exclude the row without changing career facts or page selection.

The independent Labs repository adds optional `onNavigationChange` and `navigate`
capabilities to contract version 1. Old hosts/remotes still work. The current
single screen reports `chat`, localized as Chat demo. A test remote exercises
multi-level navigation without introducing new application screens or a router.
The host measures the breadcrumb row to preserve the remote's full-width surface
and available-height contract. Callbacks from disposed mounts are ignored.

## Verification

- `npm run test:ui`: 7 passing theme compatibility and remote screen checks.
- `npm run test:content`: 28 passing content, graph, date and publication checks.
- `npm run test:breadcrumbs`: both locales, all page families, one breadcrumb
  and JSON-LD list, parent destinations, project base paths, 390/864/1222px,
  light/dark themes, long labels, keyboard navigation, home/404 and print hiding.
- `npm run test:labs-breadcrumbs`: run against the all-locale development server
  configured for the local remote; covers nested navigation, translated labels,
  stale callbacks, old v1 remotes, connection failure/retry and touch input.
- Public bilingual build, `test:publication`, `test:wiki` and
  `node scripts/verify-built-site.mjs` preserve directory routes, graph behavior,
  shared tags and career exports. PDFs are ignored review artifacts, not sources.
- Actual local Vue remote and mobile Labs/About/wiki presentation were inspected.
- Labs `npm test` passed all 6 tests and its production build passed. All four
  career PDFs were regenerated: each resume is one A4 page, each CV three pages.
  All eight rendered pages were inspected; no breadcrumb, clipping or stretched
  skill chips were observed. Public publication verification covered 581 HTML
  routes with and without trailing slashes.

The static breadcrumb regression is included in CI. The federation fixture test
is local because it needs a host configured with a remote entry. Re-run both
when upgrading Docusaurus or Module Federation, including the native Home and
StructuredData wrappers and metadata-backed blog headers.

## Delivery boundaries

Implementation is committed locally on `codex/unified-breadcrumbs` and
`codex/breadcrumb-navigation` in Labs. No push, PR, merge or deployment was
requested for this change. The existing unrelated Labs `App.vue` and `style.css`
edits remain uncommitted and are not included in the contract commit.

The sample has one actual screen, not multiple navigable product pages. Production
Labs still requires its normal trusted remote-entry deployment configuration.
