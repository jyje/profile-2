# Role-focused career documents

## Accepted decisions

- Add Selected CV between the one-page Resume and unfiltered Full CV.
- Initial roles: AI Platform Engineer (default), AI Agent Engineer, LLM Inference Platform Engineer.
- Change title, summary, selected duties/projects/skills and ordering together.
- Selected CV has no page limit. Historical titles, dates and verified outcomes remain source facts.
- Use current public records only. Do not infer inference throughput from GPU research utilization.
- Follow-up decision: split shared bilingual records into `.yaml` files and assemble with stable IDs.
- Keep short and detailed expressions under the same duty/outcome ID; share period and contribution metadata.
- Align career controls and typography with the site's existing color and spacing system.
- Restart the all-locale local server for user review. No production deployment or merge is in scope.

## Implementation checklist

- [x] Three canonical document routes and three role profiles in both locales.
- [x] Shared `.yaml` records, explicit profile references, and build-time validation.
- [x] Existing bilingual fields compared before removing the old authoring files.
- [x] Stable CV anchors retained across record reordering and tag links.
- [x] URL role state, locale/document navigation, clipboard fallback, print controls and keyboard focus.
- [x] Responsive screen layout, site theme tokens, and separate print spacing.
- [x] Documentation of authoring, text variants, PDF export and content limitations.
- [ ] Final visual review, local restart and PR delivery recorded below.

## Verification

Local validation uses Node 26.10.0 and the existing Playwright Chromium workflow.
The complete suite covers typecheck, UI boundaries, 43 content tests, public
publication routes, bilingual career interactions, existing graph/tag links,
breadcrumbs, homepage curation and wiki behavior.

PDF exports cover 14 files and 24 pages: six one-page resumes, six two-page
Selected CVs, and two three-page Full CVs. The exporter checks fonts/assets,
searchable names and role titles, A4 size, text bounds and empty pages. All pages
are rendered for visual review in ignored `output/pdf/review/`.
Browser review images are ignored under `output/career-review/`.

Review findings addressed: preserve shared historical facts during migration;
use exact ID references instead of source-array positions; retain the original
CV anchors; wait for hydration before interaction; test native-control focus and
selection without OS-specific popup key sequences; avoid a nearly empty final
print page by adjusting spacing, not font sizes; keep normal letter spacing on
resume role titles.

## Content limitations

Detailed descriptions are only as complete as the current public source.
Inference latency, throughput, cost improvements and richer project narratives
remain future content enrichment requiring evidence. They are not missing
software features. Generated PDFs are review outputs, not published downloads.
