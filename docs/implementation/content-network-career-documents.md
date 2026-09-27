# Content network and career documents

Status: completed on 2026-09-27 KST. Implementation, independent review, merge
and deployment verification are complete. This document is a closed delivery
record, not an active execution loop.

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

## Delivery loop used

Each concern was implemented, tested and committed separately in one integration
PR. Read-only Claude Code `claude-opus-5-5` review was followed by fixes and a
second review. Final CI passed before draft status was removed. The PR was
merged only after the user's separate approval. No usage-limit wait or model
substitution was needed.

## Progress

- [x] Repository and open GitHub work audited; issues #10 through #16 created.
- [x] Requested Claude Code model availability verified.
- [x] Content network implemented and tested.
- [x] Resume/CV implemented and visually verified.
- [x] CI and project-path build verified.
- [x] Independent review findings resolved.
- [x] Final-head CI passed and PR made ready for review.
- [x] Separate merge approval received; PR #17 merged and issues #10 through #16 closed.
- [x] GitHub Pages deployment succeeded; production routes and interactions checked.
- [x] Plan and review records reconciled with the delivered state.

## Completion evidence

- [Merged PR #17](https://github.com/jyje/profile-2/pull/17), merge commit `eb70038`.
- [Final implementation CI](https://github.com/jyje/profile-2/actions/runs/36259718035), head `05af88b`.
- [Successful Pages deployment](https://github.com/jyje/profile-2/actions/runs/36275246699), merge commit `eb70038`.
- [Production site](https://jyje.github.io/profile-2/): both locales' canonical
  home, blog, wiki, resume and CV routes verified, plus graph navigation, shared
  tags, CV anchors, font loading and mobile career layouts.

See [the review record](content-network-review.md) for the production URL
compatibility caveat and the distinction between HTTP status and browser display.
The completion cleanup is documentation-only; it does not alter routing or
require another deployment.
