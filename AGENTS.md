# Content authoring and component rules

## Markdown and MDX pages

- The About section has an overview page at `/about`, a resume page at `/about/resume`, and a portfolio page at `/about/portfolio`; the site home remains `/`.
- Author the Korean overview page in `src/pages/about.mdx` and its English translation in `i18n/en/docusaurus-plugin-content-pages/about.mdx`.
- Keep prose and locale-specific labels in those MDX files. Do not add overview copy or repeated content arrays to a TSX page.
- Structured content can use supported YAML fences such as `list-type-2x2` and `list-type-image-header` in localized profile pages, wiki documents, blog posts, and other Docusaurus pages. The shared Remark plugin validates their item fields at build time.
- Use native Markdown for prose, headings, tables, ordinary lists, and Obsidian callouts. Reach for a custom template only when the content is repeated structured data that benefits from a consistent visual layout.
- Each visual template has one component entrypoint and its own CSS module under `src/components/ContentTemplates/<TemplateName>/`. A template component implements one template only. Shared dispatch belongs in `src/components/ContentTemplates/index.tsx`.
- Template CSS modules own the layout and visual classes. MDX authors provide data, not presentation classes or inline styles.
- When adding a template, register its fence schema in `plugins/content-templates/remark-plugin.cjs`, document a localized example in the authoring guide, and keep the component, styles, labels, and validation aligned.
- Use `useBaseUrl` for static assets referenced from template data so GitHub Pages project paths continue to work.
- Blog listing cards remain data-driven by Docusaurus blog front matter and `src/components/BlogListPage`; do not duplicate that list in Markdown. Resume remains data-driven by `data/resume.{ko,en}.yml` and `src/components/Resume`.

## UI integration boundaries

- Keep profile-2 on Docusaurus public APIs: standard routing, MDX, i18n, search and color mode remain authoritative. Do not eject or replace the theme to add a UI library.
- Add shadcn/ui primitives selectively under `src/components/ui/`. Use `components.json`, the existing `@site` alias, and the public `configurePostCss` hook. Components are owned source, not an automatically updated theme.
- Tailwind uses the `tw:` prefix and no Preflight. Do not introduce global element resets or unprefixed utility classes. Map colors to existing Infima/site tokens and use `[data-theme='dark']`; do not add a second theme provider.
- Review generated component diffs before accepting CLI changes. Keep existing content-template entrypoints and CSS modules; do not migrate working document layouts to Tailwind merely for consistency.
- Validate both locales, static rendering, GitHub Pages base paths, keyboard focus, light/dark mode and narrow viewports when adding primitives. Scope portal containers and tokens explicitly when adding dialogs or popovers.
- Vue Labs is an independent application and may use extensive custom UI or Vue-native libraries. Keep its styles inside its Shadow DOM and its locale/theme/mount contract stable. Do not import React UI components directly into Vue or share framework runtimes merely for styling.
- AI Elements is not installed by this foundation. Adopt React-specific AI components only after checking framework dependencies and SSR compatibility; frontend libraries must not contain provider secrets or enforce backend authorization by themselves.
