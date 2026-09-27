# Docusaurus compatibility and upgrades

This policy complements [site operations](site-operations.md) and the
[authoring/component rules](../../AGENTS.md). It describes the repository's
maintenance obligations, not a guarantee of compatibility with future releases.

## Baseline and sources of truth

At this policy's introduction, the host targets Docusaurus 3.10.2, React 19,
and Node 26. `.nvmrc` selects 26.10.0 while CI/Pages select major 26. Consult
[package.json](../../package.json), [package-lock.json](../../package-lock.json),
[.nvmrc](../../.nvmrc), and the workflow files for the actual current versions.

`future.v4: true` in [docusaurus.config.ts](../../docusaurus.config.ts) enables
v4 preparation behavior available in the installed v3 release. It does not
install v4, certify third-party plugins, or prove a future migration complete.
Review individual future/experimental settings when upgrading, including the
deliberately disabled VCS fallback for authored modification dates.
See the [official future configuration reference](https://docusaurus.io/docs/api/docusaurus-config#future).

## Integration boundaries

Prefer theme configuration, standard i18n files, scoped CSS, and public plugin
APIs before swizzling. If customization is necessary, wrap the smallest useful
component with `@theme-original`; preserve upstream state and interaction logic.
Do not eject the theme or copy event handlers just to add a UI library.

Wrapping is lower maintenance, not an upgrade guarantee. Check the target
version's swizzle safety classification and original component props/exports.
Unsafe components can break in minor releases, even if the site still compiles.
See [Docusaurus's swizzling guidance](https://docusaurus.io/docs/swizzling).

### Compatibility inventory

| Surface | Review on upgrade |
| --- | --- |
| `src/theme/` wrappers | Original component names, aliases, props, metadata providers, breadcrumb structured data, dropdown/sidebar behavior, and layout hooks |
| Content synchronization and visibility | Front matter, locale mirrors, Git-derived dates, exclusions, generated indexes, and canonical metadata without source/body leakage |
| Content templates | Remark/MDX transforms, YAML validation, localized labels, and static rendering |
| Content network, document graph, global tags, redirects, and llms-txt plugins | Public plugin lifecycle/data shape, canonical permalinks, local/global graphs, and excluded content |
| Locale/color preference plugins | HTML injection, cookie/base-path scope, query/hash preservation, and Docusaurus-owned theme state |
| `@easyops-cn/docusaurus-search-local` | Declared peer compatibility, both-locale indexing, public-content filtering, and search UI in static output |
| Selective shadcn/Tailwind integration | Public PostCSS hook, `tw:` prefix, no Preflight/global reset, Infima tokens, dark-mode inheritance, and SSR |
| Vue Labs federation | Browser-only loading, optional v1 navigation, update/unmount cleanup, locale/theme synchronization, timeout/retry, and full-width layout |

Use the [UI integration guide](../../src/components/ui/README.md),
[document graph guide](../../plugins/document-graph/README.md),
[wiki maintenance guide](wiki-content.md), and
[Labs contract](../../src/components/FederatedLabs/INTEGRATION.md) for details.
Review any newly added integration against this inventory rather than assuming
it is covered by tests for an older component set.

### Explicit internal-API exception

[publication-blog-routes.mjs](../../scripts/publication-blog-routes.mjs) imports
`parseBlogFileName` from the blog plugin's `lib/blogUtils.js` to reproduce filename
slug fallback in publication verification. This is a verifier-only dependency,
not a supported public API. For every Docusaurus upgrade, inspect the target
implementation and verify filename/date/slug resolution and excluded-blog routes.
Prefer a public replacement if one becomes available. Do not silently skip these
checks if the internal export changes.

Do not add new `theme-common/internal` or direct theme `lib` imports as a shortcut.
Any unavoidable exception needs a documented reason, owner surface, removal path,
and regression test before approval.

## Dependency policy

- Upgrade direct official `@docusaurus/*` packages together to one target release.
  Keep core, preset, faster, redirects, types, tsconfig, and module aliases aligned,
  and verify resolved versions in the lockfile. Use exact target versions when
  making that coordinated upgrade, rather than leaving official packages free to
  drift independently. This follows the [official same-version requirement](https://docusaurus.io/docs/installation#updating-your-docusaurus-version).
- Commit manifest and lockfile together. Regenerate with the approved Node/npm
  environment, review the diff, then prove a clean `npm ci` install. Do not use
  an incidental `npm update` as a framework migration.
- Check engines and peer dependencies for Node, React/React DOM, MDX, TypeScript,
  search, and build plugins. Match the target release's requirements, not a
  guessed v4 requirement. Record the Node/npm versions used in local and CI checks.
  Node changes must reconcile `.nvmrc`, engines, CI, and Pages configurations.
- Do not use `--force`, `--legacy-peer-deps`, or a forced audit fix to hide conflicts.
  Upgrade, replace, or defer the incompatible integration with explicit review.
- Keep framework upgrades separate from feature changes and unrelated dependency
  churn. Security fixes take priority, but still require compatible installation
  and verification. Automated dependency PRs do not imply automatic merge approval.
- shadcn components are owned source: updating a package does not update their
  generated code. Review upstream changes, styles, and licenses explicitly.
  Vue Labs dependencies can evolve independently; do not share React/Vue runtimes
  merely for styling, and retain the versioned host contract.

### Security overrides

The current scoped overrides are security compatibility constraints, not permanent
version policies. Keep this inventory synchronized whenever an override changes.

| Override | Current reason and removal gate |
| --- | --- |
| `@module-federation/dts-plugin` -> `adm-zip` 0.6.1 | Existing advisory mitigation described in the Labs integration guide. Remove only when the parent resolves a patched version without the override and federation tests/builds pass. |
| `copy-webpack-plugin` and `css-minimizer-webpack-plugin` -> `serialize-javascript` 7.0.7 | Existing transitive security pin. Confirm the current advisory and the parent's supported fixed range; remove only after clean resolution and static build verification. |
| `sockjs` -> `uuid` 11.1.1 | Existing transitive security pin in development transport. Confirm the advisory and API compatibility; remove only after upstream resolution and dev/HMR verification. |

For an override addition or revision, record the advisory URL/ID, affected dependency
path, runtime/build-only exposure, compatibility evidence, and removal condition
in the upgrade PR. The legacy pins above do not substitute for a fresh advisory
review and are not proof that the complete dependency tree is vulnerability-free.

## Upgrade workflow

| Change | Required review |
| --- | --- |
| Patch | Release notes, clean install, all automated verification gates, and core-page smoke checks |
| Minor | Patch gates plus the full compatibility inventory, original wrappers/internal exports, and the manual interaction matrix |
| Major, including v4 | Separate migration branch/PR, official migration guide, explicit third-party support, config/build/SSR/style review, and every gate before promotion |
| Canary or prerelease | Isolated evaluation branch only; no default production deployment or implied stable support |

1. Start from the current main branch in an isolated or free worktree. Record the
   starting commit, deployed baseline, current versions, and existing test failures.
2. Read official release notes and any migration guide for the exact target.
   Check each community integration's declared support and changelog. A permissive
   peer range alone is not proof of working SSR or browser behavior.
3. Update the coordinated dependencies and only necessary compatibility changes.
   Inspect lockfile resolution, peer warnings, experimental flags, and overrides.
4. Run the gates below. Report failures and untested cases; do not equate successful
   compilation with compatible navigation, search, publication, or print output.
5. Submit a focused English PR with before/after versions, risk inventory, necessary
   exceptions, command results, manual evidence, known limitations, and rollback
   baseline. Do not auto-merge. Publish only after review and authorization.

## Verification gates

Run the [site operations verification sequence](site-operations.md#verification-and-career-exports)
against a clean install and a public bilingual `/profile-2/` build. It covers
typecheck, UI/content tests, publication verification, built-site browser/PDF
checks, wiki behavior, and breadcrumbs. Also verify a root-base-path build when
changing routing/base-path handling or performing a major upgrade.

The [CI workflow](../../.github/workflows/ci.yaml) runs the static suite, but not
every manual check or the separately configured Labs fixture suite. Record these
additional results in the PR:

- Both locales at 390, 864, and 1222px in light/dark mode: navbar dropdowns,
  sidebar access, long breadcrumbs/titles, focus visibility, keyboard activation,
  touch input, and no horizontal overflow. Respect reduced-motion preferences.
- Direct entry and slash/slashless requests, old redirects, language switching
  with query/hash, cookie-free language detection, and JavaScript-free HTTP
  behavior. Test that public HTML/assets/search/graphs/tags/indexes omit development
  content, while the all-locale development view includes its warning callouts.
- Blog list/grid, actual search results, global tags and cross-links, graph
  hover/drag, and document-level graph rendering. Preserve canonical destinations.
- `npm run test:labs-breadcrumbs` against the configured development host:
  old/new v1 remotes, nested fixture navigation, translated labels, stale callbacks,
  errors/retries, and unmount cleanup. Inspect the actual Vue remote too; fixtures
  do not certify production remote deployment or API services.
- Regenerate Korean/English career exports and render every PDF page. Each resume
  stays one A4 page; CVs stay multi-page without content loss. Confirm hidden
  breadcrumbs/tools, font loading, page breaks, and normal skill-chip height.

Use [Docusaurus release notes](https://github.com/facebook/docusaurus/releases)
and [official migration guidance](https://docusaurus.io/docs/migration) as upstream
references. This checklist is the repository's acceptance policy, not an upstream
promise that every extension will keep working.

## Deployment verification and rollback

After an authorized merge, follow the Pages workflow for the exact merged commit
through successful deployment. A green PR build or successful upload is not by
itself deployment evidence. Check the deployed base path in both languages,
representative wiki/blog/About pages, search, styles/assets, and Labs' expected
configured state. Confirm exclusion of development-only routes and assets.

If a regression is found, record the failing URL/behavior and deployment SHA.
Revert the focused upgrade through a reviewed PR, including its manifest,
lockfile, and necessary config/adapter changes; do not reset unrelated work or
rewrite main history. Rebuild and redeploy the last known-good dependency state
through the normal workflow, then repeat smoke checks. If a security fix is
rolled back, explicitly document the renewed exposure and mitigation rather than
silently accepting it. Keep the follow-up issue open until the regression is
resolved and verified on the deployed site.
