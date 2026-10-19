# Dependency security review

## Baseline and scope

Reviewed on 2026-10-18 against main `a750ad996e3f9a00556714d4d862379eead6c1ea`.
The site uses Docusaurus 3.10.2, React 19 and Node 26.10.0. This change does not
upgrade the framework, change content or UI, publish the site, or include the
three existing uncommitted files in the original checkout. Work is isolated on
`codex/security-dependency-alerts` in a separate worktree.

GitHub reports these packages as runtime dependencies because Docusaurus is a
production dependency in npm. Actual exposure here is Node-based build, glob,
watch and CSS processing. GitHub Pages serves static output, not these Node
services. This narrows exposure but does not make compromised build inputs safe.

## Findings and decisions

| Alert | Baseline | Treatment |
| --- | --- | --- |
| #9 and #10, Tinypool | 1.1.1 via Docusaurus core | Scoped override to 2.1.2, fixing both prototype-pollution gadgets. Verify the upstream SSG worker options and actual multi-worker rendering, not just import success. |
| #11, postcss-selector-parser | 6.1.4 through cssnano, alongside patched 7.1.6 copies | Pin all paths to 7.1.6. This crosses older CSS consumers' major range and requires real CSS/minification and browser checks. |
| #6, braces | 3.0.3 via chokidar and micromatch | No upstream patched release. Apply a reproducible, integrity-checked local depth guard and keep the upstream alert open. This is mitigation, not dependency-level resolution. |

Primary references:

- [Worker options advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
- [Run options advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr)
- [Tinypool 2.1.2 release](https://github.com/tinylibs/tinypool/releases/tag/v2.1.2)
- [Selector parser advisory](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)
- [Braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [Braces upstream issue and proposed depth guard](https://github.com/micromatch/braces/issues/70)

## Operational boundaries

Use repository scripts and lifecycle-enabled `npm ci`. The patch changes
installed dependencies only, never the registry tarball or published version.
No audit exception, alert dismissal or `npm audit --force` is used.
Do not pass attacker-controlled glob patterns into the development server or
build configuration. Builds of untrusted contributions must not receive secrets.
Treat the LAN development listener as a development tool, not a public service.

The braces patch intentionally rejects extreme nesting with a controlled
`SyntaxError` before recursive evaluation, including caller-supplied ASTs.
Normal shallow patterns retain the original implementation. This does not
promise arbitrary untrusted pattern expansion is inexpensive or safe in a
request handler. Existing range/output limitations still apply.

## Verification evidence

Verified with Node 26.10.0 / npm 11.19.1:

- Clean `npm ci` applied the root lifecycle patch successfully. No forced or
  legacy-peer installation flags were used. npm reported existing third-party
  lifecycle approval notices; the production build still completed successfully.
- `npm run test:security`: 9 tests passed, including prototype-inherited worker
  options, missing/tampered patch rejection and deep string/direct-AST inputs.
- Typecheck, UI (12), content (32) and design-system (13) tests passed; design
  lint and content-format checks reported zero violations.
- Public bilingual `/profile-2/` build passed, including a repeat build with
  `DOCUSAURUS_SSG_WORKER_THREAD_COUNT=2`. That environment switch is an installed
  Docusaurus implementation detail used only for this compatibility experiment,
  not a new production API dependency.
- Publication verification checked 517 HTML routes with slash/slashless access
  and scanned 901 public output files for career-data boundaries.
- Built-site browser checks, wiki graphs/interactions, breadcrumbs and homepage
  checks passed in both locales and their existing responsive/theme matrices.
- Lockfile review found only two changed package versions: Tinypool 1.1.1 to
  2.1.2 and selector parser 6.1.4 to 7.1.6. Duplicate parser copies were deduplicated.
- `npm audit --json` has zero critical or moderate findings. It still exits 1
  with 30 high dependency-chain findings, all tracing to the single braces
  advisory. The scanner cannot account for the local mitigation.

Remote alerts change only after an authorized default-branch merge and GitHub
rescan; local mitigation does not close #6. No push, PR, merge or deployment is
part of this local implementation. The original checkout's edits remain separate.

The first screenshot-lint run overlapped a verification rebuild and observed
transient missing English files. It was discarded and rerun against the completed
static output; do not interpret that race as a CSS compatibility result.
The completed rerun passed all 420 screenshot/coordinate checks across both
locales, five viewport widths, and light/dark themes.
