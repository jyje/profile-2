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

A page without an English version falls back to the Korean original on the English site. However, linking from an English page to a page that has no English counterpart fails the build, so create the pair at the same path for every page you link to. That failure is what catches broken links.

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

## Writing rules

- Use the `.md` extension. Use `.mdx` only when a React component is needed.
- Blog files are named `YYYY-MM-DD-slug.md`, and the `slug` in the front matter becomes the URL.
- Use tags registered in `content/*/blog/tags.yml`.
