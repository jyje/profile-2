# Independent review and verification

## Reviewer

Claude Code 2.1.283, exact model `claude-opus-5-5`, read-only Read/Glob/Grep tools,
safe mode, no MCP servers, no session persistence. First review completed on
2026-09-27 KST against the implementation through `c5a708a`.
Verdict: conditional approval, no merge-blocking defect identified. The reviewer
explicitly did not execute checks; implementation-agent and CI evidence is separate.

## Findings and disposition

| Finding | Disposition |
| --- | --- |
| F1: FontFace presence is not proven by `fonts.check` | Check nonempty loaded faces for both weights; fail on same-origin asset errors |
| F2: Expired certificates appear in summary | Preserve historical facts; label the section Certification history and dates Issued - expiry, without claiming current validity |
| F3: Legacy sync watchers bypass lock; timeout too short | Direct/watch sync uses the same lock, build holds it across sync and bundle; waiting logs once and retries until release |
| F4: Failed PDF artifacts are not uploaded | Upload with `always()`, tolerate no files before export, retain 7 days; actual ARM runner passed |
| F5: Anchors registered independently from rendered elements | Card and SkillGroup register the ID they actually render |
| Locale selections may drift | Compare selected record dates, certificate URLs, language identifiers and skill names across locales |
| Global data contains unused fields; index calculated twice | Drop descriptions/dates from graph global data; reuse the promise for the same allContent/locale/context |
| Design document wrongly classified as portfolio | Only the portfolio directory gets that classification |
| Fallback assertion incomplete | Assert the wiki node is actually flagged as a Korean fallback |
| CV mobile coverage absent | Check both career views at 390, 864 and 1222 CSS pixels |
| Sparse PDF page guard | Retained intentionally: fewer than 80 searchable characters is a layout-review failure, not a claim of literal emptiness |
| Separator changes | Intentional, following the repository's prohibition on em dashes |

## Additional implementation QA

- Fixed official blog metadata `Date` serialization: tag dates remain ISO calendar
  dates, not locale weekday strings; fixture covers actual Date instances.
- Reproduced stale CSS font URLs when alternating root and project-base builds.
  The shared build lock now invalidates only generated/cache folders when the
  deployment context changes. Published outputs and authored content are preserved.
- Existing template and source facts are reused. No private application PDFs are
  imported or published. Summary selection is explicit, not automatic truncation.

## Evidence

- Initial remote CI: https://github.com/jyje/profile-2/actions/runs/36258722330
- TypeScript and content/UI tests passed before the review.
- Both locale builds at `/profile-2/` passed broken-link checks.
- Browser checks cover a wiki-to-graph entry, mixed blog/wiki tag results, a CV
  anchor and career document viewport overflow. These are targeted regression
  checks, not a claim that every route was manually clicked.
- Four A4 PDFs: both resumes are one page; both CVs are three pages. Searchable
  names, page bounds, sparse pages and local font assets are checked automatically.
- Every page was rendered and visually inspected. Final review fixes are subject
  to another build, export, visual pass and remote CI before PR readiness.

## Remaining gate

Follow-up Opus review and final post-fix CI are pending. Do not merge automatically.
