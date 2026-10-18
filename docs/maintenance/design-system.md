# Profile design system and versioned content

This contract governs the public Docusaurus host, including Home, blog/wiki,
About and its manual LinkedIn resume gateway. Specialized resumes/CVs, facts and
PDF exports belong in the private workspace. Vue Labs retains its independent
Shadow DOM design system. Nothing here restores private public-source documents.

## Executable rules

| Rule | Contract and enforcement |
| --- | --- |
| UX-001 | Shared Home-glyph origin after excluding the actual sidebar; coordinates, captured pixels and drift canaries |
| DS-001 | Rendered colors use named site/Infima/component tokens; PostCSS rejects raw colors. Named graph palettes remain component-owned |
| DS-002 | Shared static spacing uses equivalent scale tokens. Exact standard rem values are safely replaced; fluid expressions and specialized values remain intentional |
| DS-003 | MDX/Markdown supplies content/data, not inline styles or breadcrumb placement. Each visual template owns one entrypoint and CSS module |
| DS-004 | AST checks native button type, icon labels, external rel and image alt; browser rejects duplicate h1 and missing alt |
| DS-005 | Refuse staged hidden/generated/retired career artifacts; public output scans and publication filtering remain authoritative |
| DS-006 | No unscoped element resets or CSS animation without a reduced-motion branch; keep the native theme authoritative |
| CONTENT-001 | Explicit template/formatter versions; unsupported future versions fail rather than being downgraded |
| CONTENT-002 | Authored titles; blog bodies do not duplicate their native h1. Heading-rank migration preserves text and IDs |
| CONTENT-003 | One non-brain emoji for wiki titles/categories, identical in translations, including ignored notes |
| CONTENT-004 | Structured fences share their schema with the Remark renderer |
| FORMAT-001 | Pinned Prettier 3.9.10 and format-v1.json; preserve prose wrapping and do not reformat embedded code |

These are targeted checks, not full WCAG, contrast, prose-quality or CSS
correctness certification. Keyboard/touch, both themes, content extremes and
human/agent screenshot inspection remain necessary. Do not invent labels or
weaken baselines to silence failures.

## Commands and scope

```sh
nvm use
npm ci
npx playwright install chromium
npm run hooks:install
npm run lint:design
npm run design:fix
npm run content:check
npm run content:format
npm run content:migrate
npm run test:design
```

Safe fixes are equivalent spacing/shadow tokens, an explicit button type outside
forms, and a missing static external-link rel. Unknown colors, alt text, intent
and layout redesigns require judgment. `content:format` does not upgrade metadata;
`content:migrate` explicitly upgrades unversioned sources and duplicate blog
heading hierarchy. Neither replaces articles with scaffold prose nor changes
dates, slugs, publication flags or facts. Home remains its interactive React page.

Title-only locale files are authored sources and obey the same version contract.
When merging new files from an older branch, run the explicit migration and
review that only missing stamps/formatting changed. Keep their bodies empty:
locale staging owns borrowed content. Tests cover this in both publication modes.

Canonical inputs are `content/{ko,en}/{blog,wiki}` and authored Korean/English
page MDX, including `.docignore` guides/design notes. Generated mirrors, hidden
drafts, build output and private repositories are not inputs. Token changes retain
current values and CSS-module ownership; no Tailwind layout rewrite is required.
Public `npm run build` enforces the static contracts. Development permits WIP
formatting; the pre-commit and publication gates do not.

## Versioned scaffolds and existing articles

`design-system/content-contract.json` selects the formatter, pinned engine/config,
block schema, and one scaffold per kind/locale under `content/_templates/v1/`:
`{ko,en}/blog.md`, `{ko,en}/wiki.md`, `{ko,en}/page.mdx`.
Root `.docignore` records `content/_templates/`; it is also outside all locale
publication roots. Neither public nor development output includes scaffolds or
their colocated assets. These are public, versioned templates, not secret storage.

```sh
npm run content:new -- --kind wiki --locale ko --path d/example.md --title '📄 예시'
npm run content:new -- --kind blog --locale en --path 2026-10-18-example.md --title 'Example'
npm run content:new -- --kind page --locale en --path example.mdx --title 'Example'
```

The generator refuses overwrites/path traversal and requires an authored blog
filename date. Fill placeholders before publication. Public-repository drafts
are not private. Supply parent breadcrumb labels/links explicitly, not from slugs.
The folder is available in the Obsidian vault; plugin settings are unchanged.

Each document records `profile_template: {kind: wiki|blog|page, version: 1}` and
`profile_format: 1`. For a breaking schema/formatter change, add v2 adapters,
scaffolds and an explicit migration, update the registry, test old/new fixtures
and idempotence, migrate and review the diff. Do not silently overwrite old prose
or float engine versions. Engine updates that change output need a format
version/migration. Nonbreaking new block names can preserve existing v1 aliases.

`media-figure` replaces legacy inline float HTML with one component/CSS module.
YAML owns image/alt/caption/credit labels and links. Credits form a validated group;
the component owns responsive placement and project-base-path asset handling.
Existing list-type blocks retain their schema and layout contracts.

## Native Git hook and index isolation

`hooks:install` sets **local** `core.hooksPath=.githooks`, makes the tracked hooks
executable and refuses to overwrite another hook setup. Fresh clones need explicit install.
Use Node 26+, including GUI/editor commits.

Chromium must be installed explicitly before rendering-related commits; the hook
does not download browsers or modify global tooling during a commit.

The pre-commit hook:

1. Rejects staged hidden/generated/retired career additions.
2. Exports the index to a disposable directory with `git checkout-index`.
3. Uses the staged formatter/config/lint implementation, not unstaged helpers.
   The working hook/bootstrap must match its staged bytes or the hook aborts.
4. Plans safe fixes. Only identical fully staged working/index files are fixed
   and individually restaged. Partial staging needing a fix aborts before writes.
   There is no stash/reset, `git add .`, or unrelated staging.
5. Checks all snapshot content/design. Rendering-related changes build that
   snapshot publicly under `/profile-2/`, typecheck, then run captures, breadcrumb
   regression and publication checks. No live dev server or stale receipt is used.
6. Rejects an index changed during validation. Evidence is retained by tree ID
   under `.playwright-mcp/precommit/<tree>/`, including index-source.json.

Git then runs `.githooks/commit-msg`. The versioned
`design-system/commit-contract.json` owns the approved Gitmoji/type pairs and
syntax: `<gitmoji> <type>(<scope>): <summary>`. Scope is required and uses lowercase
kebab-case (slash-separated component paths are supported); the English summary
starts with a lowercase letter. In particular, `⬆️ dep(...)`, `📝 article(...)`,
`🔨 build(...)` and `🚀 release(...)` are supported. `🚀 ci(...)` is not valid.
The local commit helper follows the same policy. Existing history is not rewritten.

Only a Git-style merge subject during an actual `MERGE_HEAD` state gets a merge
exception. A normal commit beginning with `Merge` does not bypass the policy.
The hook checks syntax, not author identity: `🤖 ci(...)` is reserved by policy for
automation but is not proof that an authenticated bot authored the commit.

The bootstrap pins both hooks, the validator and the policy JSON to staged bytes.
Stage them coherently when adopting/updating this feature; an unstaged hook or
policy cannot silently validate a different index. Installation changes local
`core.hooksPath` only. GitHub UI commits and unconfigured clones do not run local
hooks; CI's `test:design` checks the implementation, not every remote subject.

Rendering inputs include source, content, locales, plugins, templates, design
contracts, scripts, manifests and workflows. Documentation-only commits still
receive static checks without repeating the browser matrix. There is no CLI skip
flag/cache. Safe fixes may remain staged after a later gate fails: review before
retrying. Editors should not write the same files during a commit.

`hooks:check` runs the index gate without committing. `test:hook:integration`
copies current non-ignored source to a disposable repository and exercises an
actual Git commit/hook there. It never stages or commits this checkout; ignored
evidence is copied to `.playwright-mcp/hook-integration/`. Unit tests separately
prove partial-stage, unstaged/untracked isolation and negative/version cases.
The fixture runs the full staged build once, then rejects an invalid empty commit
without repeating that build. Fast native tests also verify accepted/rejected
subjects, unchanged HEAD/index on rejection, real merge handling, paths containing
spaces, both hook permissions and refusal to overwrite another hooksPath.

`hooks:check` can safely autofix/restage fully staged files just like the commit
hook; it is not a read-only status command. For first adoption, stage tooling,
configuration and migrated sources as a coherent change. The hook intentionally
does not validate an unstaged formatter against an old staged tree.

Git options can bypass local hooks, so they are not authorization boundaries.
PR CI, public-build preflight, and Pages pre-upload checks independently enforce
the rules. Repository branch-protection settings were not changed.

CI and Pages upload diagnostics only after the named UX gate has actually run,
on success or failure, not after an earlier skipped gate. Missing output after a
run remains an error. `include-hidden-files: true` is restricted to the exact
`.playwright-mcp/ux-lint/after/` directory because its parent is hidden. Never
widen that path to the checkout, hidden drafts or other local artifacts. Workflow
tests reject unconditional uploads, broader paths and relaxed missing-file checks.

## Local completion evidence: 2026-10-18

- Migrated 77 canonical documents, including ignored notes and both locales, to
  template/formatter v1. Standard spacing in 13 existing stylesheets became
  equivalent tokens. Facts, dates, slugs and draft flags were preserved. Two blog
  heading subtrees were demoted below native h1.
- Replaced CAPA's bilingual inline floated figure with a shared media/credit
  template. Mobile light and desktop dark detail captures were opened, together
  with Home, portfolio and wiki captures.
- A native Git pre-commit passed in a disposable repository for staged tree
  `46facda322e23362423860741299fa61ae178a05`: public bilingual build/typecheck,
  420/420 capture cases, three detected drift/hidden-icon canaries, 20 media
  detail captures, breadcrumb/print/link checks and 517 static routes.
- 12 design/formatter/hook tests, 12 UI/contract tests and 29 content/public-boundary
  tests passed. Fixtures cover partial-stage safety, unstaged formatter isolation,
  generated/private rejection, nonpublication in both modes, and generator
  overwrite/path protection. The public scanner checked 901 output files.
- The skill was extended and the repository-local hook installed. At that
  dry-run stage no real checkout commit/staging, push, remote CI run or deployment
  had been performed. Test commits existed only in the owned disposable
  repository, which was removed after verification.

The local report is under
`.playwright-mcp/hook-integration/precommit/46facda322e23362423860741299fa61ae178a05/ux-lint/after/`.
This evidence is for that tested snapshot, not a promise that future prose or
private PDFs automatically have good design. Review and explicit migrations
remain necessary. The test repository had no previous commits; normal repository
and CI builds still use full Git history and authored date overrides.

### Authorized local delivery

The owner subsequently authorized sequential local commits. Implementation
`ca1508b` passed the actual native hook for staged tree
`afaa3b0b809b090b57bee13e935d12352e07c681`: fresh bilingual public build,
typecheck, 420/420 captures, three detected canaries, breadcrumb/print regressions,
517 slash/slashless HTML routes and 901 public output files. Fresh portfolio and
mobile Resume captures were opened. Reports remain ignored under
`.playwright-mcp/precommit/afaa3b0b809b090b57bee13e935d12352e07c681/`.

Commit `1fff778` records editor settings and enforcement/preservation instructions;
`ee5e6e6` records the canonical project skill and discovery symlink. Static gates
passed for both follow-up commits. The final maintenance cleanup records the
closed local result. No push, remote CI, independent review or deployment is
claimed. The existing Obsidian local-settings edit remains outside these commits.

## Primary references

- [Git hooks and core.hooksPath](https://git-scm.com/docs/githooks)
- [Prettier installation and version pinning](https://prettier.io/docs/install)
- [Prettier pre-commit integration](https://prettier.io/docs/precommit)
