# Profile design system: UX lint

## UX-001: one breadcrumb origin

The Home glyph is the invariant anchor across tabs, not its title or reading
width. The available pane starts at the actual visible left sidebar's right
edge, or viewport x=0 without a sidebar. A right-hand TOC is not a left sidebar.

| Measurement | Required CSS px |
| --- | --- |
| Nav left minus pane left | 16 |
| Nav top minus navbar bottom | 16 |
| Home SVG left minus nav left | 10.234375 |
| Home SVG top minus nav top | 6.109375 |
| Home SVG width and height | 17.59375 |
| Coordinate tolerance | 0.75 |

This preserves wiki/Infima's 0.8 breadcrumb scale at the default root font size.
The test values are independent of implementation tokens, so changing all pages
together cannot silently pass. An intentional typography change requires review.
Exactly one breadcrumb and shared frame must exist. Home, 404 and redirect-only
pages omit them. No hero nesting or horizontal overflow; long labels wrap and
print hides navigation.

## Common placement template

- `BreadcrumbFrame` and its CSS module own placement. `SiteBreadcrumbs` owns
  non-wiki presentation and schema, not page offsets.
- `Layout` consumes placement context before content. BlogLayout reports native
  sidebar presence; BlogPostPage uses original Docusaurus title metadata.
- `MDXPage` reads localized authored `breadcrumbs` front matter. Prose and labels
  stay in MDX; no URL-derived names or repeated route-to-label map is introduced.
- `DocItem/Layout` places original DocBreadcrumbs inside the common frame. A
  context guard prevents OriginalLayout from inserting it twice. Native content,
  sidebar, TOC, hierarchy and schema remain upstream. Its original reading
  container is restored underneath the full-pane navigation.
- Global tags and native tag archives use the frame outside reading width.
- Labs uses the frame inside its measured bar. Remote full-width layout and its
  versioned navigation/update/unmount contract remain unchanged.

No absolute positioning, post-hydration DOM relocation or copied theme handlers
are needed. The blog sidebar calculation uses Infima container tokens and the
existing 920px sidebar exception. Tests measure the real aside, so dependency
upgrades cannot silently invalidate that calculation.

## Capture audit

```sh
# Public GitHub Pages project-path build:
SITE_BASE_URL=/profile-2/ npm run build
npm run lint:ux

# Existing bilingual development staging:
VERIFY_ORIGIN=http://localhost:3000 VERIFY_BASE_PATH=/ npm run lint:ux
```

Default input is `build/` served under `/profile-2/`. `VERIFY_BUILD_DIR`,
`VERIFY_BASE_PATH`, and `UX_LINT_OUTPUT` select another explicit build/report.
Use a local or CI build, not a production remote for mutation canaries.

The current matrix covers 20 breadcrumb routes plus the breadcrumb-free Home,
two locales, 390/864/920/1222/1728px and light/dark: 420 cases. CAPA's media figure
also receives 20 detail captures. The 920px sidebar boundary and wide desktop are explicit
cases, not extrapolated from a small laptop. Cases include every About destination, wiki home/document
and tag archives, blog list/post/archive/authors/tagged pages, global tags, search,
and Labs. There is currently no individual-author route. These are representative
page families, not a claim to visit every content document. Existing breadcrumb
tests cover labels, links, schema, long titles, keyboard and print; Labs fixture
tests separately cover optional navigation and remote states.

The [design-system gate](design-system.md) adds title/alt checks and runs this
matrix against an exported staged snapshot before rendering-related commits.
The historical 360-case completion record below predates the expanded matrix.

Each case saves a PNG plus SHA-256, coordinates and failures in
`.playwright-mcp/ux-lint/after/report.json`. `index.html` is a capture contact sheet.
Captured Home pixels are compared with wiki at the same viewport/theme/locale.
This detects an invisible icon that retains its box; independent fixed geometry
detects drift of the reference itself. Deliberate vertical, horizontal and hidden
icon canaries must be detected. Failure cases also retain screenshots.

Both PR CI and the Pages build run the gate before publication and upload
captures/report after success or failure. The Pages gate uses its configured
deployment base path, so direct main pushes do not bypass this check. Explicit
human/agent inspection remains required for sign-off. Do not weaken tolerances or
replace expectations to accept a regression. Reports are ignored, not content.

## Initial audit

At 1222px, Korean light-mode Home SVG positions before normalization were:

| Page | Absolute x | Navbar-relative y |
| --- | ---: | ---: |
| Wiki, sidebar ends at 300px | 326.234 | 22.109 |
| Blog list without sidebar | 162.219 | 38.109 |
| Blog post, sidebar ends at 326px | 352.234 | 38.109 |
| About overview | 67.234 | 22.109 |
| About portfolio | 67.234 | about 126.196 |
| Global tags | 173.234 | 54.109 |
| Labs | 26.234 | 22.109 |

Portfolio inherited hero padding and reveal movement; other tabs inherited
centered containers and unrelated top margins. The correction isolates navigation
from reading/hero layout and preserves authored content and reading widths.
Before captures are local under `.playwright-mcp/ux-lint/before/`.

The versioned project skill is [profile-design-system](../../skills/profile-design-system/SKILL.md).
AGENTS.md requires it for layout work, including agents that do not discover
tool-specific skill directories. A `.claude/skills/profile-design-system` symlink
points to this single source; `.agents -> .claude` exposes it to both clients.
This is not a new theme or permission to publish changes.

## Verified local completion, 2026-10-18

- Fresh public all-locale build under `/profile-2/`: 360/360 UX-001 capture cases,
  no geometry or captured-glyph failures, all three injected canaries detected.
- Initial root staging matrix: 216/216 cases at 390/864/1222px. The expanded
  five-width matrix was run against the final public build, not inferred.
- UI/contract tests: 12 passing; content/public-boundary tests: 29 passing;
  TypeScript and `git diff --check` passed.
- Existing breadcrumb labels/links/schema, long-title wrapping, keyboard,
  home/404 and print checks passed in both locales and the project base path.
- Public route verification covered 517 HTML routes with/without trailing slash;
  the public career-boundary scanner checked 901 output files. About navigation,
  blog sidebar visibility and navbar ordering passed.
- Labs fixture: ready, ancestor navigation, translated callbacks, legacy remote,
  error/retry, disposal/late callbacks, touch and full-width mount passed.
  Its actual remote mount had been losing 2px to a surrounding border; that border
  and its extra height were removed. State captures live in the ignored `labs/`
  sibling directory. No live provider/backend functionality is claimed.
- Capture contact sheets were opened for Korean light desktop, English dark
  desktop, Korean dark mobile, and English light tablet. The generated PNGs and
  SHA-256 values remain available in the local report for independent review.
- The skill passed the skill-creator validator. CI is configured to run the same
  gate and upload captures. At this initial audit no commit, push or deployment
  was requested or performed. Prior unrelated working-tree changes were preserved.

### Subsequent local commit verification

The owner authorized local commits after the initial audit. The actual native
pre-commit gate passed for implementation `ca1508b`, staged tree
`afaa3b0b809b090b57bee13e935d12352e07c681`, with the expanded 420/420 matrix,
three detected canaries, 20 media detail captures, typecheck, breadcrumb/print
checks, 517 static routes and 901 public output files. Fresh Korean desktop
portfolio and English dark mobile Resume captures were opened. Follow-up changes
are editor settings, instructions, the skill and maintenance records, not rendered
layout changes. See [local closeout](../implementation/local-design-system-closeout.md).
No push, remote CI or deployment is implied by the local result.
