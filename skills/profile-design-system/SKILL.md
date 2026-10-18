---
name: profile-design-system
description: Maintain profile-2's Docusaurus design system and screenshot-based UX lint when changing page layout, breadcrumbs, navigation, shared CSS, or theme wrappers. Audit and repair regressions without redesigning content or replacing native theme interactions.
---

# Profile design system

For token, accessibility, authoring/schema/formatter or commit-gate work, read
[the full contract](../../docs/maintenance/design-system.md). Use the project's
`lint:design`, `design:fix`, `content:check`, `content:format`, `content:migrate` and
`content:new` commands. Do not invent a parallel formatter or copy scaffold prose
over articles. Include ignored guide/design sources, exclude hidden/generated
content, and keep specialized resume/CV facts and exports in the private workspace.

The native hook checks an exported Git index using staged tools/config. Never
stash/reset or restage partial/unrelated edits to make it pass. Rendering changes
require a fresh snapshot build and captures, not a live server or stale receipt.
Do not disable the hook or weaken a baseline. CI/Pages are independent backstops;
local hooks alone are not an authorization boundary.

This is the project design contract, not a generic visual redesign skill.
Preserve Infima/site tokens, authored bilingual content, native interactions,
reading widths, and full-width Vue Labs. Do not introduce a second theme.

Read [UX lint](../../docs/maintenance/ux-lint.md) before changing layout. Inspect
`git status` and preserve local work. Follow the Docusaurus compatibility policy.

## Case 1: UX-001 breadcrumb origin

- Use `BreadcrumbFrame` for placement and `SiteBreadcrumbs` for non-wiki display.
  Wiki must render the original theme breadcrumb once, not a copied implementation.
- Measure the actual Home SVG, not its label or just the nav box.
- The pane starts at the visible left sidebar's right edge, otherwise viewport
  x=0. A right-hand TOC does not affect this origin.
- Nav starts 16 CSS px below the navbar and 16 CSS px into that pane. Home SVG
  geometry is fixed in `scripts/ux-lint-contract.mjs`, tolerance 0.75px.
- Keep navigation outside hero spacing, reveal animations, and reading widths.
- About labels and links belong in localized MDX `breadcrumbs` front matter.
  Never derive titles from slugs or insert inline breadcrumbs into a hero.
- Preserve native hierarchy/JSON-LD, links, wrapping, print hiding, and Labs
  callbacks. Do not copy upstream dropdown/sidebar event handlers.

## Audit and repair

1. Capture affected pages before editing. A stale build is not verification.
2. Run `npm run lint:ux` against a fresh public project-path build. For bilingual
   staging use `VERIFY_ORIGIN=http://localhost:3000 VERIFY_BASE_PATH=/ npm run
   lint:ux`. Do not overlap content builds or switch to a single-locale server.
3. Read `.playwright-mcp/ux-lint/after/report.json` and open the PNGs. Compare About
   overview/portfolio/resume, wiki, blog list/post, tags and Labs at each width,
   both themes and locales. DOM coordinates alone are not visual sign-off.
4. Fix the divergent owner: shared frame, original layout boundary, sidebar
   geometry, or authored placement. Do not add per-route offsets, transforms,
   hidden duplicates, or screenshot exclusions to make the test pass.
5. Rerun the full matrix and inspect fresh captures. Pixel checks and injected
   vertical/horizontal displacement and invisible-icon canaries must also pass.
6. Run UI tests, typecheck, breadcrumb tests and tests for touched sections.
   Verify GitHub Pages base-path output separately from localhost. Reports stay
   ignored locally; CI uploads intended review artifacts only.

Do not change coordinates, widen tolerances, or remove existing supported routes
to accept regressions. Baseline changes require an explicit design decision.
New page families need a regression case. New UX rules need a stable ID, a
measurable invariant, screenshots, and a failing negative test before joining CI.

## Completion evidence

Report the defect/owner, shared entrypoints changed, tested source/build/base URL,
capture count and failures, screenshots actually inspected, canary detection, and
limitations. Do not claim deployment, authorization, or remote-app availability
from a layout pass. Commit/push/publication require separate user authorization.
Never copy private career facts or secrets into reports or tests.
