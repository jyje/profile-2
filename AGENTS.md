# Content authoring and component rules

## Plan completion and remote communication

- Once a plan is completed, reconcile its status and checklist with the actual result. Record verification, review, commit/PR references, and deployment evidence when deployment was in scope. Distinguish remaining limitations from unfinished deliverables.
- Close the plan with a focused cleanup commit, or an explicitly requested local-only commit. Preserve the decision and review history; do not leave completed work described as pending approval, review, merge or deployment.
- Respect the user's commit and push authorization. A local completion commit does not imply permission to push or deploy again.
- Write GitHub issues, PR descriptions, reviews and comments in English. This does not change the site's bilingual content requirements.

## Markdown and MDX pages

- Every authored wiki title and category label starts with one emoji, including development-only notes. Translations share the Korean source emoji. Use `🏠` for Wiki Home, `📚` for Documents, `🧭` for Guides, `🛠️` for Design and `📄` for otherwise unclassified notes. Do not use the brain emoji. Source validation runs before publication filtering.

- Publication exclusions belong in root `.docignore`. Keep authoring guides in `content/{ko,en}/wiki/_guide/` and site design notes in `_design/`. Local staging exposes them at `/wiki/guide/` and `/wiki/design/`; public builds must exclude their pages and colocated assets before Docusaurus metadata, search and graph generation.
- `npm run build` is public by default; local development entrypoints explicitly opt in with `SITE_CONTENT_MODE=development`. Do not use browser hostname checks to conceal already-published content. Never put secrets in development notes or the public repository.
- Local staging automatically prepends a localized publication warning to documents matched by `.docignore`. It precedes any English fallback notice. Do not copy this generated warning into authored Markdown.
- Do not edit `.content-build/` or generated locale mirrors. Treat canonical routes and initial HTTP status separately from client-side recovery. Preserve directory-index output and run `npm run test:publication` after routing or publication changes.
- Wiki and blog update dates use Docusaurus `showLastUpdateTime`. Staging injects `last_update.date` from the authored file's last Git commit, preserving explicit overrides. English fallback pages inherit the Korean source date. Never substitute build time or filesystem mtime; use full Git history in CI. New uncommitted documents have no inferred date.
- The About section has an overview at `/about`, a one-page resume at `/about/resume`, a detailed CV at `/about/cv`, and a portfolio at `/about/portfolio`; the site home remains `/`.
- Author the Korean overview page in `src/pages/about.mdx` and its English translation in `i18n/en/docusaurus-plugin-content-pages/about.mdx`.
- Keep prose and locale-specific labels in those MDX files. Do not add overview copy or repeated content arrays to a TSX page.
- Structured content can use supported YAML fences such as `list-type-2x2` and `list-type-image-header` in localized profile pages, wiki documents, blog posts, and other Docusaurus pages. The shared Remark plugin validates their item fields at build time.
- Use native Markdown for prose, headings, tables, ordinary lists, and Obsidian callouts. Reach for a custom template only when the content is repeated structured data that benefits from a consistent visual layout.
- Each visual template has one component entrypoint and its own CSS module under `src/components/ContentTemplates/<TemplateName>/`. A template component implements one template only. Shared dispatch belongs in `src/components/ContentTemplates/index.tsx`.
- Template CSS modules own the layout and visual classes. MDX authors provide data, not presentation classes or inline styles.
- When adding a template, register its fence schema in `plugins/content-templates/remark-plugin.cjs`, document a localized example in the authoring guide, and keep the component, styles, labels, and validation aligned.
- Use `useBaseUrl` for static assets referenced from template data so GitHub Pages project paths continue to work.
- Blog listing cards remain data-driven by Docusaurus blog front matter and `src/components/BlogListPage`; do not duplicate that list in Markdown. Career facts remain in `data/resume.{ko,en}.yml`. The detailed CV uses `src/components/Resume`; the one-page layout uses `src/components/ResumeSummary` and explicit selection in `data/career-layout.yml`. Do not silently truncate content, invent facts, or shrink print text to force a page count.
- Graph nodes, global tag entries and related content must use the shared `plugins/content-network.cjs` index built from Docusaurus metadata. Canonical permalinks, not source filenames or guessed slugs, define navigation. Exclude draft/unlisted metadata and do not publish source paths or document bodies in global data.
- Validate career exports in both locales with `npm run export:pdf`: the summary must be exactly one A4 page and the CV multiple A4 pages. Render and inspect every page after layout changes. Keep generated PDFs ignored; upload only intended review artifacts.

## UI integration boundaries

- Site breadcrumbs reuse wiki/Infima styling. Keep native wiki breadcrumb components and use small wrappers for the Wiki Home parent; other pages use `SiteBreadcrumbs` with localized authored labels or Docusaurus metadata. Never derive titles from URL slugs. Labs reports optional screen IDs and labels through its v1 mount contract; render navigation in the host only and do not publish virtual screen IDs as SEO routes. Keep breadcrumbs out of print layouts.
- Keep profile-2 on Docusaurus public APIs: standard routing, MDX, i18n, search and color mode remain authoritative. Do not eject or replace the theme to add a UI library.
- Prefer theme configuration and standard i18n JSON before swizzling. Navbar labels belong in `i18n/<locale>/docusaurus-theme-classic/navbar.json`, not locale branches in React components.
- Delegate dropdown interactions to the original theme on desktop and mobile. When site-specific labels or destinations require a wrapper, use `@theme-original` and retain only that customization; do not copy upstream state, event handlers or CSS. Avoid direct `@docusaurus/theme-classic/lib` imports and new `theme-common/internal` dependencies.
- Keep required custom sidebar breakpoints and shared tag destinations. On Docusaurus upgrades, regression-test hover, keyboard and touch navigation, locale query/hash preservation, and project-base-path links in both locales. Wrapping reduces maintenance but does not guarantee compatibility across major versions.
- Add shadcn/ui primitives selectively under `src/components/ui/`. Use `components.json`, the existing `@site` alias, and the public `configurePostCss` hook. Components are owned source, not an automatically updated theme.
- Tailwind uses the `tw:` prefix and no Preflight. Do not introduce global element resets or unprefixed utility classes. Map colors to existing Infima/site tokens and use `[data-theme='dark']`; do not add a second theme provider.
- Review generated component diffs before accepting CLI changes. Keep existing content-template entrypoints and CSS modules; do not migrate working document layouts to Tailwind merely for consistency.
- Validate both locales, static rendering, GitHub Pages base paths, keyboard focus, light/dark mode and narrow viewports when adding primitives. Scope portal containers and tokens explicitly when adding dialogs or popovers.
- Vue Labs is an independent application and may use extensive custom UI or Vue-native libraries. Keep its styles inside its Shadow DOM and its locale/theme/mount contract stable. Do not import React UI components directly into Vue or share framework runtimes merely for styling.
- AI Elements is not installed by this foundation. Adopt React-specific AI components only after checking framework dependencies and SSR compatibility; frontend libraries must not contain provider secrets or enforce backend authorization by themselves.
