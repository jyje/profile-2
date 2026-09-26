# Docusaurus-compatible UI primitives

The site keeps Docusaurus 3.10's Classic theme, content plugins, routing and
localization. This is a selective, manual shadcn/ui integration, not a theme
replacement. Consumers include the Labs remote-loading retry button, blog
list/grid selection and pagination, and document-graph controls and search.

## Boundaries

- `components.json` uses the existing `@site` alias and `rsc: false`.
- `plugins/tailwind.cjs` adds Tailwind 4 through `configurePostCss`, a public
  Docusaurus plugin hook. No webpack replacement or theme ejection is needed.
- `src/css/shadcn.css` imports theme and utilities only, without Preflight.
  Classes use `tw:`. Only this directory is scanned for utility candidates.
- Colors reference existing Infima/site variables. Docusaurus's
  `[data-theme='dark']` remains the only theme state. There is no next-themes
  provider and no additional theme cookie.
- `src/lib/utils.ts` merges prefixed classes. Existing document CSS modules and
  content templates are not migrated. Put new primitive styles here instead
  of scattering utilities across Markdown content.
- Generated source belongs to the repository. Review CLI output before accepting
  it, especially global CSS changes, aliases, unprefixed utilities and Next.js
  imports. Keep the source/license notice when adapting upstream components.

## Usage in React or MDX

```tsx
import {Button} from '@site/src/components/ui/button';

<Button type="button" variant="outline" onClick={retry}>Retry</Button>
```

Keep translated labels in their existing localized content. For navigation,
compose `Button asChild` with Docusaurus `Link` so base URLs remain supported.
No client-only wrapper is required for Button. Components using browser APIs
must separately pass Docusaurus static rendering before adoption.

Button preserves native `aria-pressed`, `disabled`, and event behavior. Use
`shape="pill"` for view selectors and `size="icon"` with an accessible name
for icon-only controls. Input forwards native input props and refs. A composed
search field may provide its own focus-within outline and CSS-module sizing.
Page CSS owns placement and dimensions, while primitives own shared colors,
hover, focus, disabled and reduced-motion behavior.

Docusaurus navbar dropdowns, mobile drawer, built-in search and document
navigation remain unchanged. Vue Labs remains independent. This migration
does not alter the graph's physics, hover/drag logic, data or selection state.

Run `npm run test:ui`, `npm run typecheck` and the bilingual build. Check light
and dark mode, keyboard focus, mobile overflow, and unaffected document styles.
When adding a portal-based component, validate its mount container, inherited
tokens, stacking and focus handling explicitly. Disabling Preflight means
upstream components may need explicit local border/spacing defaults.

## Vue Labs and AI Elements

`jyje/labs` stays an independently styled Vue remote. It may use custom UI or
Vue-native primitives, but host React components cannot be directly imported
into Vue. Shadow DOM isolates its styles, not its JavaScript security context.
Keep locale/theme synchronization and the versioned mount lifecycle stable.

AI Elements is not part of this initial integration. Its documented Next.js
setup is not a guarantee of Docusaurus compatibility. Evaluate each required
React component separately; do not add Next.js to the host or silently change
the Vue application's framework to satisfy a UI dependency.
