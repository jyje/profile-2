# Content authoring and component rules

## Markdown and MDX pages

- The self-introduction page is `/about`; the site home remains `/`.
- Author the Korean page in `src/pages/about.mdx` and its English translation in `i18n/en/docusaurus-plugin-content-pages/about.mdx`.
- Keep prose and locale-specific labels in those MDX files. Do not add About copy or repeated content arrays to a TSX page.
- Structured content can use supported YAML fences such as `list-type-2x2` and `list-type-image-header` in localized About pages, wiki documents, blog posts, and other Docusaurus pages. The shared Remark plugin validates their item fields at build time.
- Use native Markdown for prose, headings, tables, ordinary lists, and Obsidian callouts. Reach for a custom template only when the content is repeated structured data that benefits from a consistent visual layout.
- Each visual template has one component entrypoint and its own CSS module under `src/components/ContentTemplates/<TemplateName>/`. A template component implements one template only. Shared dispatch belongs in `src/components/ContentTemplates/index.tsx`.
- Template CSS modules own the layout and visual classes. MDX authors provide data, not presentation classes or inline styles.
- When adding a template, register its fence schema in `plugins/content-templates/remark-plugin.cjs`, document a localized example in the authoring guide, and keep the component, styles, labels, and validation aligned.
- Use `useBaseUrl` for static assets referenced from template data so GitHub Pages project paths continue to work.
- Blog listing cards remain data-driven by Docusaurus blog front matter and `src/components/BlogListPage`; do not duplicate that list in Markdown. Resume remains data-driven by `data/resume.{ko,en}.yml` and `src/components/Resume`.
