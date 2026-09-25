---
title: Obsidian authoring guide
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

When a wiki page has no English counterpart, the build preparation step copies the Korean original and its assets to the same path on the English site. The generated page starts with an English callout explaining that no English version is available and recommending browser translation. The source under `content/ko/` is not modified.

Open [Document graph](../graph.mdx) from the Wiki sidebar to explore connections between notes and tags. The local Docusaurus `document-graph` plugin reads Markdown links and tags at build time. Grab and shake a node to move its neighbors, or drag the background and use the wheel to pan and zoom. Select a node to inspect its neighbors, open the fallback page, or go directly to the Korean original.

## Links and images

```md
[another note](../design/resume.md)
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

- Use the `.md` extension. Use `.mdx` only when a React component is needed.
- Blog files are named `YYYY-MM-DD-slug.md`, and the `slug` in the front matter becomes the URL.
- Use the shared taxonomy for blog and wiki content. Register each kebab-case slug and its Korean and English display names in `data/tags.yml`, then run `npm run sync`.
