---
sidebar_position: 1
---

# Resume and detailed CV

## Document roles

The [one-page resume](/about/resume) is a curated overview. The [detailed CV](/about/cv) includes work, projects, education, skills, certifications, activities, publications and languages. The [portfolio](./portfolio.md) links project evidence and implementation details.

## Sources and templates {#data-contract}

- Career facts: `data/resume.ko.yml` and `data/resume.en.yml`
- Explicit summary selection: item and bullet indices plus localized summaries in `data/career-layout.yml`
- One-page template: `src/components/ResumeSummary/`
- Detailed CV template: `src/components/Resume/`
- Each template owns a CSS module; shared print rules live in `src/css/career-print.css`.

Add only verified career facts. Never silently truncate text or automatically shrink typography to meet a page count. Tests reject stale selection indices. Certification dates are displayed as authored; the document does not infer current validity.

## Printing

The **Print / Save PDF** button opens the browser dialog. Use A4, 100% scale and background graphics. Disable browser headers and footers for manual printing. The automated exporter renders the same pages and adds page numbers to the CV only.

## Validation {#validation-resume-lint}

```sh
npm run typecheck
npm run test:content
npm run dev
# In another terminal
npm run export:pdf
```

Install Chromium once with `npx playwright install chromium`. Generated artifacts live in ignored `output/pdf/`. Set `PDF_BASE_URL` to a static origin serving every locale, including a project subpath when needed.

The exporter requires one A4 page for each resume and multiple A4 pages for each CV. CI also checks content navigation, tag links, CV anchors and narrow-screen overflow against the GitHub Pages project path. Page counts alone do not establish visual quality: render and inspect every PDF page for clipping, overlap, blank pages and Korean font rendering.

## Content connections

Career tags connect to blog posts and wiki documents through [shared tags](/tags). Career links target detailed CV anchors so they do not depend on summary selection. Explore document relationships in the [document graph](../graph.mdx).
