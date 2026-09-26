# Content network and career documents

## Scope and acceptance

This work preserves Docusaurus routing, i18n, original theme behavior, existing
graph interaction, the independent Vue Labs app, and the bilingual YAML source
of career facts. It does not publish private job applications or add claims.

| Issue | Deliverable | Verification |
| --- | --- | --- |
| #10 | Canonical blog/wiki metadata index | Fixtures for routes, MDX, visibility and locales |
| #11 | Blog/wiki/tag graph and direct links | Graph invariants and browser navigation |
| #12 | Backlinks and related entries | Original-theme wrappers, empty/list behavior |
| #13 | MDX fallback and authored i18n watching | Fallback and watcher fixtures |
| #14 | One-page resume and detailed CV | Shared YAML, explicit selection, responsive views |
| #15 | Bilingual PDF export | A4, page counts, overflow, text and visual review |
| #16 | Regression gates and independent review | Tests, project-path build, Opus 5.5 review |

## Approach

Use official plugin metadata rather than reconstructing permalinks from filenames.
Keep explicit document links distinct from shared-tag relationships. Keep the
existing graph page inside Wiki, with both blog and wiki entries discoverable.
Use small wrappers to add related content without copying theme rendering.

The resume is a curated one-page view. The CV retains detail. Both use existing
localized YAML. Do not shrink or crop content to hide a pagination failure.
The existing local reference resume has one A4 page and the portfolio has six.
Reference PDFs are read-only visual references, not imported public artifacts.

## Delivery loop

Implement and test each concern, commit separately, push one integration PR.
Request a read-only review using Claude Code `claude-opus-5-5`, address valid
findings and rerun relevant checks. Do not merge without a separate request.
If rate-limited, preserve progress and retry after the provider reset; never
silently substitute a different review model.

## Progress

- [x] Repository and open GitHub work audited; issues #10 through #16 created.
- [x] Requested Claude Code model availability verified.
- [x] Content network implemented and tested.
- [x] Resume/CV implemented and visually verified.
- [x] CI and project-path build verified.
- [x] Independent review findings resolved.

Delivery is tracked in [PR #17](https://github.com/jyje/profile-2/pull/17).
The final-head CI check is the readiness gate. Issues remain open until merge;
this implementation task does not authorize merging the PR.
See [the review record](content-network-review.md) for evidence and boundaries.
