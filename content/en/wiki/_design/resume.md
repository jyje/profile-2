---
sidebar_position: 1
---

# 📄 Role-focused resume and Selected CV

## Document roles

The [one-page resume](/about/resume) is a curated overview. The [Selected CV](/about/selected-cv) expands relevant projects and experience without a page limit. The [Full CV](/about/cv) includes work, projects, education, skills, certifications, activities, publications and languages. The [portfolio](./portfolio.md) links project evidence and implementation details.

## Sources and templates {#data-contract}

- Career facts: bilingual `.yaml` records under `data/career/`; separate employer/project files and grouped short records
- Role configuration: `data/career/index.yaml` and `profiles/*.yaml`, with titles, summaries and stable ID references
- Role keys: `platform` (default), `agents`, `inference`
- Selected CV template: `src/components/SelectedCV/`
- One-page template: `src/components/ResumeSummary/`
- Detailed CV template: `src/components/Resume/`
- Each template owns a CSS module; shared print rules live in `src/css/career-print.css`.

Add only verified career facts. Never silently truncate text or automatically shrink typography to meet a page count. Builds reject missing/duplicate IDs, duplicate anchors, orphaned records and bilingual ID mismatches. Certification dates are displayed as authored; the document does not infer current validity.

## Text variants and assembly

Shared metadata holds dates, URLs and contribution. Localized prose holds titles, roles, optional one-line overviews and longer narratives. Every `responsibilities`/`outcomes` item has a stable ID, a concise `summary` and an optional `detail` expression of the same fact.

Resume profiles select a record ID, a duty/outcome ID and `text: summary`. Selected CV selects a record ID and `text: detail`, including all authored details. Missing detail uses the authored summary. Do not duplicate career facts into role files.

## Printing

The **Print / Save PDF** button opens the browser dialog. Use A4, 100% scale and background graphics. Disable browser headers and footers for manual printing. The automated exporter renders the same pages and adds page numbers to Selected CV and Full CV.

## Validation {#validation-resume-lint}

```sh
npm run typecheck
npm run test:content
npm run dev
# In another terminal
npm run export:pdf
```

Install Chromium once with `npx playwright install chromium`. Generated artifacts live in ignored `output/pdf/`. Set `PDF_BASE_URL` to a static origin serving every locale, including a project subpath when needed.

The exporter requires one A4 page for each role-specific resume and multiple A4 pages for each Full CV. Selected CV has no page limit. The complete export contains 14 PDFs; role-specific filenames include the role key. CI also checks content navigation, tag links, CV anchors and narrow-screen overflow against the GitHub Pages project path. Page counts alone do not establish visual quality: render and inspect every PDF page for clipping, overlap, blank pages and Korean font rendering.

## Role focus

Choose AI Platform Engineer, AI Agent Engineer, or LLM Inference Platform Engineer. The title, summary, selected projects and skills change together. Historical job titles and dates remain as authored. Selected CV includes every existing detail for each chosen project.

Share `?role=platform`, `?role=agents`, or `?role=inference`. Document and locale links retain the selection. Full CV always shows all records and hides the role selector. Missing or unknown query values use the default profile. Static HTML, search and llms.txt expose the default profile.

Only current public source facts are used. GPU research-resource utilization is not recast as inference throughput. Inference latency, throughput, cost improvements and additional project context remain content-enrichment opportunities requiring evidence.

## Content connections

Career tags connect to blog posts and wiki documents through [shared tags](/tags). Career links target detailed CV anchors so they do not depend on summary selection. Explore document relationships in the [document graph](../index.md#document-graph).
