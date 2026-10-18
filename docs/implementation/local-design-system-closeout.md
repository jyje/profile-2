# Local About and design-system closeout

Date: 2026-10-18. Status: completed locally with owner-authorized commits.

## Delivery sequence

1. `ca1508b`: disconnect public career documents and deliver the interdependent
   About, breadcrumb, blog-navigation, formatter and staged-gate foundation as
   one buildable adoption. It also configures CI/Pages backstops.
2. `1fff778`: connect editor formatting and record mandatory design/content and
   source-preservation rules.
3. `ee5e6e6`: add the canonical project design-system skill and discovery symlink.
4. This maintenance cleanup: reconcile completed records, current operations,
   upgrade checks and the separate future private-access roadmap.

The initial integration is intentionally not split into intermediate snapshots
that fail the newly installed staged-index gate. The completed About checklist
has become a delivery record; implementation and decision history are retained.

## Preservation and boundaries

Retired career sources, renderers, selection settings and tools were preserved,
not destroyed. The original archives remain, and all 91 extracted file copies
were compared byte-for-byte with their entries. The source archive hash matches
its private manifest. These materials stay in Git-ignored local storage for the
future private migration. They are not part of these public-source commits.

Git records removal of their former public paths. Public routes, imports,
generation, tags and PDF CI no longer depend on them. Historical Git contents,
past deployments and external caches have not been erased. The manual LinkedIn
entry is not authentication, request storage, approval or protected hosting.

## Verification

- Fresh unit/contract run: 53 tests passed, with no failures or skips.
- Static design and content checks: zero violations; staged diff checks passed.
- Actual native hook for staged tree
  `afaa3b0b809b090b57bee13e935d12352e07c681`: clean exported-index bilingual
  public build under `/profile-2/`, typecheck, 420/420 capture cases, three detected
  drift/visibility canaries, 20 media detail captures, native breadcrumb/schema,
  links, keyboard, wrapping and print checks.
- Publication check: 517 HTML routes with/without trailing slashes; 901 public
  output files passed the career boundary scanner.
- Fresh portfolio and mobile Resume PNGs were opened for visual inspection.
  Ignored reports and captures remain keyed by the staged tree, not live-server
  state. Documentation/editor/skill follow-ups passed the static staged gate.
- Existing Obsidian local settings remain unchanged and uncommitted.

Only local commits were authorized. No push, remote CI execution, independent
review, merge or deployment is claimed. The live site is unchanged by this work.
