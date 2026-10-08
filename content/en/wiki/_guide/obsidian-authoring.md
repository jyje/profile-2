---
title: "🧭 Obsidian authoring guide"
sidebar_position: 1
tags: [guide, obsidian]
---

## Opening the vault

Open the `content/` folder of this repository as a vault in Obsidian. `content/.obsidian/app.json` is committed, so the settings below apply automatically.

- Links are **relative-path Markdown links**, not `[[wikilinks]]`, because Docusaurus resolves them as they are.
- Renaming or moving a file updates the links that point to it.
- Attached images are stored in the `assets/` folder next to the note.

## Folder layout

```text
content/
├─ ko/            ← Korean (default language)
│   ├─ blog/
│   └─ wiki/
└─ en/            ← English. Same path and same file name as the ko counterpart
    ├─ blog/
    └─ wiki/
```

Every wiki document and blog post needs a file at the same path under `content/en/` with an English title, even when the body is not translated yet. The title comes from front matter `title` or the first `# Heading`, and it must not contain Korean text. A missing English file or title fails the build, including development-only notes.

A document that has a title but an empty body borrows the body of the same document in another locale, English first and Korean second. The page keeps its own title and front matter, inherits fields it omits such as `slug` and `tags`, and starts with a callout that the article is only available in the other language. If neither locale has a body, the build fails. Korean assets without an English copy are mirrored to the English site. Sources under `content/` are not modified.

```md
---
title: "☸️ Kubernetes"
---
```

Explore wiki, blog and tag connections in the [graph at the bottom of Wiki Home](../index.md#document-graph). Each wiki document and blog post also receives a local graph automatically, showing direct links, backlinks and its own tags. No Markdown embed is required. Grab and shake a node to move its neighbors, or pan the background and use the zoom controls. The node selector and document link provide keyboard access.

## Links and images

```md
[another note](./publication.md)
![caption](./assets/diagram.png)
```

## Callouts

Obsidian callout syntax is converted to Docusaurus admonitions on the site.

> [!note] Note
> A general remark.

> [!warning] Heads up
> A warning box.

> [!danger]
> Without a title, the type name becomes the title.

## Reusable templates

Repeated structured data in blog posts, wiki documents, and pages can use YAML code fences. Put the template name where the code-fence language normally goes. The templates are available to all blog and wiki Markdown/MDX, not only About. Required fields and unsupported fields are checked during the build.

### Two-column list

`list-type-2x2` displays named items with descriptions in two columns.

```list-type-2x2
- name: Kubernetes
  description: Declare, deploy, and operate containerized workloads.
- name: Argo Workflows
  description: Run container-based workflows on Kubernetes.
```

### Timeline with images

`list-type-image-header` accepts a name, optional image and description, and start/end years. If `end` is omitted, the item is displayed as current.

```list-type-image-header
- name: Hyundai AutoEver
  image: /img/logos/hae.png
  description: Design and operate platforms.
  start: 2025
```

Keep ordinary prose, tables, and lists as Markdown. Each visual template has one dedicated component; do not combine multiple template renderers into one component.

## Writing rules

### Connections and graph

Blog posts and wiki documents share the same tag registry. The connections section below a document shows incoming links, outgoing links and related entries with shared tags. Its graph link opens the document's neighborhood. Blog listing previews do not repeat these sections.

Use relative Markdown links within a collection. Between blog and wiki collections, use the real site path, such as `/wiki/d/k8s`. Equal titles do not merge different routes. Code examples are not indexed as links. Computed JSX navigation is not indexed, so author important relationships as Markdown links.

Title-only English `.md` and `.mdx` pages show the Korean body with a browser translation notice; the staged page uses the body source's extension. Authored English translations are preserved. Pages marked `draft: true` or `unlisted: true` are excluded from the public graph and shared tag listings.

- Use the `.md` extension. Use `.mdx` only when a React component is needed.
- Blog files are named `YYYY-MM-DD-slug.md`, and the `slug` in the front matter becomes the URL.
- Use the shared taxonomy for blog and wiki content. Register each kebab-case slug and its Korean and English display names in `data/tags.yml`, then run `npm run sync`.
