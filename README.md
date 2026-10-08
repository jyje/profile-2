<div align="center">

# jyje/profile-2

<img src="static/img/logo-128.png" width="96" height="96" alt="jyje logo" />

**Jeayoung Jeon (전제영) · AI Platform Engineer**

Projects, engineering experience, and a connected personal knowledge base.

[Visit the site in English](https://jyje.github.io/profile-2/en/) · [한국어 사이트](https://jyje.github.io/profile-2/)

[![CI](https://github.com/jyje/profile-2/actions/workflows/ci.yaml/badge.svg)](https://github.com/jyje/profile-2/actions/workflows/ci.yaml)
[![GitHub Pages](https://github.com/jyje/profile-2/actions/workflows/publish-github-pages.yaml/badge.svg)](https://github.com/jyje/profile-2/actions/workflows/publish-github-pages.yaml)

</div>

I am a software engineer working across AI and clusters, connecting research with
product development. I care about practical technology and the drive to solve
problems, and I explore the technologies behind AI-native development.

## Explore

| Section | What you will find |
| --- | --- |
| [Blog](https://jyje.github.io/profile-2/en/blog/) | Engineering experiences, project write-ups, and retrospectives. |
| [Wiki](https://jyje.github.io/profile-2/en/wiki/) | The technical notes and references that form my personal knowledge base. |
| [Labs](https://jyje.github.io/profile-2/en/labs/) | An experimental Vue chat UI demo, not a live AI service. Availability depends on the configured remote app. |
| [About](https://jyje.github.io/profile-2/en/about/) | My background, areas of work, and career. |

## Experience & Work

- [Portfolio](https://jyje.github.io/profile-2/en/about/portfolio/): selected projects and their context.
- [Resume](https://jyje.github.io/profile-2/en/about/resume/): a one-page career summary.
- [Detailed CV](https://jyje.github.io/profile-2/en/about/cv/): a longer account of experience and skills.

The resume and CV are available in Korean and English, with print layouts for PDF export.

## Connected Knowledge

Blog posts and wiki notes share [tags](https://jyje.github.io/profile-2/en/tags/),
related links, and interactive document graphs. The wiki home provides the broader
graph; individual posts and notes show the connections around that document.

The home page introduces the site and provides direct links to Blog, Wiki, Labs,
and About. Korean and English are supported; every wiki note and blog post has an
English title, and untranslated bodies show the Korean original with a
browser-translation notice.

## Behind the Site

The host uses Docusaurus, React, TypeScript, and Markdown/MDX. It keeps the Classic
theme and native navigation, with small extensions for content templates, graphs,
and shared tags. [Vue Labs](src/components/FederatedLabs/INTEGRATION.md) is a separate application
loaded through Module Federation.

This repository is the successor to [jyje/profile](https://github.com/jyje/profile).
The links above point to the profile-2 GitHub Pages deployment; they do not assume
that the existing `jyje.online` domain has migrated to this repository.

## Run Locally

Use the Node.js version in [.nvmrc](.nvmrc). With nvm installed:

```bash
nvm install
nvm use
npm ci
npm run dev
```

Open `http://localhost:3000/` or `http://localhost:3000/en/`. Both languages rebuild
and reload together. The server binds to `0.0.0.0:3000` for LAN access; use it only
on a trusted network. Labs needs its separately running remote app.

## Maintenance

- [Site operations](docs/maintenance/site-operations.md): edit content, develop, verify, and publish.
- [Docusaurus compatibility and upgrades](docs/maintenance/docusaurus-compatibility.md): integration boundaries, dependency policy, upgrade gates, and rollback.
- [Vue Labs integration](src/components/FederatedLabs/INTEGRATION.md): run and configure the independent remote.
