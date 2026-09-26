# Independent review and verification

## Reviewer

Claude Code 2.1.283, exact model `claude-opus-5-5`, read-only Read/Glob/Grep tools,
safe mode, no MCP servers, no session persistence. First review completed on
2026-09-27 KST against the implementation through `c5a708a`.
Verdict: conditional approval, no merge-blocking defect identified. The reviewer
explicitly did not execute checks; implementation-agent and CI evidence is separate.

Follow-up review completed on 2026-09-27 KST against `dd71058`, using the same
exact model and read-only tools. Verdict: ready to merge after final CI, with no
unresolved actionable or blocking correctness findings. F1 through F5 and the
additional date/build-context fixes were confirmed. No model substitution or
usage-limit wait was required.

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
- Post-review remote CI: https://github.com/jyje/profile-2/actions/runs/36259334688
- TypeScript, 10 content tests and 6 UI tests passed.
- Both locale builds at `/profile-2/` passed broken-link checks.
- Browser checks cover a wiki-to-graph entry, mixed blog/wiki tag results, a CV
  anchor and career document viewport overflow. These are targeted regression
  checks, not a claim that every route was manually clicked.
- Four A4 PDFs: both resumes are one page; both CVs are three pages. Searchable
  names, page bounds, sparse pages and local font assets are checked automatically.
- Every page was rendered and visually inspected after the review fixes. A final
  print-only adjustment keeps the certification heading and history together;
  both locale exports still produce one-page resumes and three-page CVs.
- The root-path bilingual live server is available separately from project-path
  CI builds. Switching deployment contexts no longer retains stale font URLs.

## Handoff gate and limits

The [PR checks](https://github.com/jyje/profile-2/pull/17/checks) must pass for the
final pushed head before removing draft status. Do not merge automatically.
Computed JSX navigation is not indexed as a document link. The CV preserves the
current structured YAML facts, not every page of the old portfolio PDF. Future
summary-anchor links should register their actual rendered IDs, as the CV does.
