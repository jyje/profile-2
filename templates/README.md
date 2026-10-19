# Document templates

Authoring skeletons and the lint rules that go with them. This folder is **not content**.

## Why it never renders

- `scripts/prepare-content.mjs` stages only `content/{ko,en}/{wiki,blog}`. Nothing under `templates/` is read, staged, mirrored, indexed, or published, in any content mode.
- `scripts/test-lint-content.mjs` keeps that promise: it stages a fixture with a template next to content and fails if the template shows up in `.content-build/`.
- Do not move templates under `content/`. A template there would be built into the site and the document graph.

## Layout and versioning

```text
templates/
└─ <template-id>/
   └─ v<N>/
      ├─ template.md   copy this to start a document
      └─ rules.json    what `npm run lint:content` enforces for documents that use it
```

- A document opts in with front matter: `template: <template-id>@<N>`, for example `template: wiki-reference@1`.
- **A published version is immutable.** Documents pin to it, so changing its rules would silently break them. Any rule change, even a rename, is a new `v<N+1>` directory.
- Keep old versions until no document pins them. The linter warns (`template-outdated`) when a document pins a version older than the latest.
- Record each version below.

| Template | Version | Change |
|---|---|---|
| `wiki-reference` | v1 | First version. Five fixed H2s (`Definition`, `Understanding`, `Usage`, `Details`, `References`), a required intro visual, and a `status: draft` gate: `Understanding` or `Usage` is a warning for drafts and required otherwise. |

## Using a template

1. Scaffold: `npm run new:wiki -- <slug> "🍓 제목" --en-title "🍓 English title" --tags infra,mini-pc`. It copies the latest version into `content/ko/wiki/d/<slug>.md` and creates a title-only `content/en/wiki/d/<slug>.md`. Add `--template wiki-reference@1` to pin a version.
2. Keep one intro visual and delete sections you do not need. Empty sections are an error; the order is fixed.
3. Run `npm run lint:content`. The build and dev server run the same check.

Other commands:

| Command | Does |
|---|---|
| `npm run lint:content -- --fix` | Mechanical repairs only: heading trailing spaces, and a legacy `## Name` that holds one bullet becomes a notation line in `## Definition`. Add `--dry-run` to preview. |
| `npm run lint:content -- --verbose` | Also lists legacy pages with no template. `--strict` turns warnings into errors. |
| `npm run report:content` | A table of every wiki reference: template, status, intro visual, thumbnail, and which sections exist. `--json` for tools. |
| `npm run build:anatomy -- <name>` | Builds `figures/<name>/build.mjs` into `static/anatomy/<name>/` (dark) and `<name>-light/`, plus `thumbnail.png`. |

Documents without a `template:` field are legacy. They get the baseline checks only and are listed by `npm run lint:content -- --verbose`.

## `rules.json`

| Key | Meaning |
|---|---|
| `headings.order` | The only H2 texts allowed, in the required order. |
| `headings.required` | H2s that must be present. |
| `headings.recommendedOneOf` | Groups where at least one H2 should be present (warning). |
| `introVisual.kinds` | What must appear before the first H2: `anatomy-figure` (the content template), `image` (a Markdown image), or `diagram` (a `mermaid` fence). |
| `frontMatter.required` | Front matter keys that must exist. |
| `emptySections` | Severity for an H2 with no content. |
| `statusGate` | `{field, draft}`. While the document's `field` equals `draft`, a missing `recommendedOneOf` group is a warning; otherwise it is an error. |
