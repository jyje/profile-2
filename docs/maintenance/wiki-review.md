# Full-plan independent review

## Scope and method

Claude Code, using `claude-opus-5-5`, reviewed `origin/main...dfaae03` in English
on 2026-09-27. The review covered all 12 commits and 107 files, not only the CV
chip fix. Session: `8533ab29-8aab-412c-9fef-6c6910b7dad3`.

The reviewer used read-only git and source inspection and did not run tests.
Separate implementation verification includes browser tests and complete PDF
rendering. Worktree corrections made during review were explicitly excluded
from the initial review verdict. This is an independent Claude Code review,
not a GitHub account approval or a claim that tests prove visual quality.

## Findings and dispositions

| Priority | Finding | Disposition |
| --- | --- | --- |
| High | Relative route links break on trailing-slash visits | Corrected all eight affected sources to file links or root-relative routes. Build rejects ambiguous relative routes. Both locales and both address forms exercise authored body links. |
| Medium | New untracked documents show the framework's 2018 example date in HMR | Disabled Docusaurus VCS fallback; staged authored dates and explicit overrides remain authoritative. Native metadata regression covers missing and known dates. |
| Medium | Single-locale sync watcher skips edits under `data/` | Paths are now relative to each watched root. Regression enumerates data files and excludes hidden files. |
| Low | Canonical/sitemap URLs redirect to slash URLs | Enabled `trailingSlash: true` and normalized redirect matching. Legacy graph selection accepts old slashless node IDs. |
| Low | Any path ending in `wiki` receives the global graph | Exact localized Wiki Home matching now also requires wiki content kind. Nested documents and blog slugs are tested. |
| Low | Single-locale HMR shares staging with public commands | Retained limitation, with command warning and maintenance guidance. Use the default all-locale server for simultaneous build workflows. |
| Low | Excluded blog checks assume directory-shaped routes | Verification now resolves explicit slugs or the installed blog parser's date/filename routes, with fixtures for both. |
| Low | Timeout retries may insert duplicate graph scripts | Timeout preserves in-flight script promises. Actual network errors allow replacement. Delayed-response browser regression checks one script per library and successful recovery. |
| Low | Print chip checks use a 1200px desktop viewport | Print verification uses A4 CSS-pixel dimensions; PDFs are still rendered and visually inspected page by page. |

## Retained behavior

- Git commit timestamps include renames and title edits; no invented historical dates.
- Excluded guide/design routes return 404 in public output by design.
- Legacy compatibility documents are generated during static builds, including
  the supported all-locale development server, not single-locale Docusaurus HMR.
- `.docignore` does not hide repository sources or authenticate LAN visitors.
- The graph uses its existing external CDN and retains text navigation on failure.
- Missing English translations deliberately show the Korean source with guidance.

## Verification ownership

The implementation agent reproduced the old chip failure, applied the fixes,
and ran unit, type, build, browser, routing and bilingual PDF checks. Review
closure, final CI, merge and deployment evidence are linked from
[PR #18](https://github.com/jyje/profile-2/pull/18).
