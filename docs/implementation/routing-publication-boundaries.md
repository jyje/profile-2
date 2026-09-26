# Static routing and development document boundaries

Status: implementation complete; final development/public verification in progress.

## Accepted scope

- Use Docusaurus directory-index HTML output for all routes, instead of a wiki-only
  redirect or client-side recovery from an HTTP 404.
- Keep authoring guides and site design notes in `_guide/` and `_design/`.
- Store public exclusion rules in the root `.docignore`, not `.profileignore`.
- Include these documents on the all-locale localhost/LAN development server,
  but remove them and colocated assets from public build inputs.
- Preserve public content, locale fallbacks, native theme behavior and graph physics.

## Implementation

`scripts/prepare-content.mjs` stages wiki/blog content under `.content-build/`.
Development mode maps excluded underscored top-level sections back to their
existing routes. Public mode omits matching sources before the normal Docusaurus
content plugins run. Generated English fallbacks use only the staged Korean
content, preventing an excluded document from reappearing through fallback.

The config checks that staged inputs match the current mode and `.docignore`.
This prevents a raw Docusaurus build from accidentally publishing a previous
development staging tree. CI and Pages explicitly set public mode. Local
commands explicitly set development mode; browser hostname is not an access gate.

The canonical metadata pipeline continues to supply graph, tags and backlinks.
Public home content no longer links to development-only guides. Existing strict
broken-link checks catch accidental public-to-development links.

## Verification

- Unit fixtures: ignore rules, both locales, MDX/assets, unchanged source files,
  development-to-public cleanup, alias collisions, invalid/missing policy and
  unsafe direct-build prevention.
- Static-host check: every generated HTML route works with and without a final
  slash without JavaScript; directory redirects preserve query strings.
- Publication check: no development route or associated page is present in the
  public HTML, JS, JSON, search index, graph payload or sitemap.
- Existing browser/PDF regression checks use a public wiki page, not a development guide.
- Confirm local document presence, locale fallbacks and source-triggered reload.

## Limits

`.docignore` applies to wiki/blog content under `content/`. It supports root-relative
globs and directory rules, not gitignore negation. It does not hide GitHub source
files, authenticate LAN users, or replace secret-management controls. Deployed
changes take effect only after the updated public build has been published.
