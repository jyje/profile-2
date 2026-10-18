# Public About and manual document access

About contains the authored overview, portfolio, and manual LinkedIn inquiry
gateway. All three use localized MDX and the small AboutSectionNav component.
The original Docusaurus dropdown behavior remains authoritative. Old Selected CV
and Full CV routes contain safe compatibility instructions, not document bodies.

The portfolio summarizes three existing public articles. Do not copy private
interview records into these pages. Public wiki portfolio notes link to public
case studies instead of duplicating detailed career claims.

## Build boundary

The complete career catalog, document renderers, selections, and PDF tools were
preserved privately before disconnection. The original files and archives remain
in Git-ignored local storage for the future private migration, with verified
copies; removal from public Git paths is not destruction of those files.
Public synchronization now compiles site data
without loading a private career catalog. It explicitly retires old generated
career files, and global tags consume only public content metadata. Public builds
must work without a private sibling repository or ignored local drafts.

The publication verifier checks text and compressed output for retired document
payloads and synthetic leak markers. Source tests prohibit retired entrypoints
and public PDF artifacts. This is defense in depth, not proof that previously
published facts have disappeared from the internet.

## Verification

Run typecheck, UI/content tests, both-locale builds, publication checks, built-site
navigation, wiki, homepage, and breadcrumb tests. Test both `/` and `/profile-2/`,
direct HTTP access, old aliases, three viewport widths, themes, keyboard, and
touch. Screenshots are local ignored review artifacts.

The current gateway does not authenticate users, save requests, approve access,
or issue documents. The future portal is tracked in [issue #37](https://github.com/jyje/profile-2/issues/37)
and the [roadmap](../roadmap/private-career-access.md). Git history, earlier
deployments, and external caches are out of scope for this change.
