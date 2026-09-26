# Wiki completion checklist

Local implementation and commits only. No push, PR, merge or deployment.
Use the house emoji for Wiki Home. Preserve the existing theme and graph physics.

- [x] Create this root checklist and initial plan commit.
- [x] Verify and commit existing publication boundaries and static routing.
- [x] Verify and commit authored last-update dates.
- [x] Embed automatic local graphs in wiki and blog detail footers.
- [ ] Move the knowledge subtree to `/wiki/d/` with compatible old URLs.
- [ ] Integrate the global graph at the bottom of Wiki Home; retire the standalone page.
- [ ] Unify localized wiki headings and emoji, including excluded sources.
- [ ] Add automatic development-only callouts based on `.docignore`.
- [ ] Verify both locales, public and development builds, responsive graph interactions and existing features.
- [ ] Preserve final decisions and verification in maintenance documentation.
- [ ] Delete this checklist and this task's temporary plan in a separate final cleanup commit.

## Acceptance

Local graphs contain the current document, direct outgoing/incoming documents and
its tags. Existing related-content lists remain. Graphs mount automatically near
the viewport and stop work offscreen. The wiki home has one global graph, not a
duplicate local graph. Old paths retain locale, query and hash compatibility.
Public output must not contain development pages, assets, search or graph entries.
New dates come from authored Git history, not build time. Existing manual dates win.

## Verification record

Baseline: 19 content tests, 6 UI tests, typecheck and 525 public static routes passed.
Earlier bilingual public build and browser verification remain recorded in the task.
Inline graph: 20 content tests and typecheck passed; the live Argo CD page renders
one active canvas with incoming/outgoing documents and its Argo Project tag.
