# About public-access refactor

<!-- TODO: Once these issues are resolved or the guidance is generalized, absorb
     the enduring content into the relevant maintenance documentation and remove
     this temporary record. Keep historical evidence in Git and the PR. -->

Date: 2026-10-18. Tracking: [issue #37](https://github.com/jyje/profile-2/issues/37).

## Authorized scope

Public overview and three existing portfolio cases; manual LinkedIn access
instructions; safe old document routes; private-source/build/CI separation.
No authentication backend, infrastructure mutation or publication. The owner
subsequently authorized sequential local commits, but not push or deployment.

## Delivered changes

- Preserved career YAML using private append-only import and hash verification.
- Preserved renderer/tooling and affected wiki-note working copies privately.
- Added localized About section navigation and public portfolio prose.
- Replaced document routes with manual-contact/compatibility instructions.
- Disconnected the career catalog, generation, tag dependencies, renderers and PDF CI.
- Added source, stale-cache, compressed-output and browser boundary tests.
- Completed clean-build and browser verification and recorded actual results.
- Recorded this stage's result in issue #37 without closing future backend work.

## Evidence and limits

Preservation verified 23 career snapshots and 88 archived source files; 37 private
authored files were unchanged. A second archive preserves the original affected
wiki notes and retired print CSS. Exact manifests and archive hashes are local
private artifacts, not public review attachments.

At the owner's request, both archives were also extracted into Git-ignored local
storage for the future private migration. All 91 file copies were compared
byte-for-byte with their archive entries; the source archive hash still matches
its manifest. Original files were retained, not destroyed. Git records removal
from public source paths because ignored private files cannot be committed here.

## Verification result

- Node 26.10.0: TypeScript, 7 UI tests, and 29 content tests passed.
- Both locales built for `/profile-2/`; 517 directory-index HTML routes passed
  slash/slashless HTTP checks, and 901 output files passed the career boundary scan.
- Browser checks passed for five About routes, both locales, 390/864/1222px,
  light/dark mode, ordinary-link navigation, aliases, keyboard, touch, and
  untrusted query handling; JavaScript-disabled document instructions passed.
  Screenshots of the mobile inquiry and desktop
  portfolio were visually inspected. Public source retains no complete career catalog.
- Wiki graphs, breadcrumbs/schema/print, search route, and homepage navigation
  regression suites passed. No live Labs/backend behavior was changed or certified.
- An independent public-source copy built both locales at `/` with no hidden
  folder, generated inputs, private sibling repository, or Git history. It reused
  installed lockfile dependencies, not a fresh npm install. Root-path publication
  and browser verification passed as well.
- Private workspace validation, 13 tests, and typecheck passed after append-only
  preservation. Existing missing-translation, editorial-review and expired-
  credential warnings remain; these are not new migration failures.

The verification code initially used a query test origin identical to the clean
build's canonical origin; that false-positive assertion was corrected and the
root suite rerun successfully. An unquoted colon in new English front matter was
also corrected before the successful bilingual build.

No remote CI, independent review, deployment, or protected document hosting is
claimed. Historical public copies and Git history are not rewritten. No layout
changes were made to private documents; new PDF rendering was therefore not part
of this refactor. Local implementation commit `ca1508b` passed the native
staged-snapshot gate: fresh public bilingual build, typecheck, 420/420 capture
cases, three detected canaries, breadcrumb regressions, 517 slash/slashless HTML
routes and a 901-file public career scan. The 53 unit/contract tests also passed.
The cleanup commit containing this record closes the local implementation plan;
it does not authorize a push or imply that the live site has changed.
