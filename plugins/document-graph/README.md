# Document Graph Docusaurus plugin

This local Docusaurus plugin uses the shared `plugins/content-network.cjs` index
from the official docs and blog metadata in `allContentLoaded`. It resolves
Markdown and MDX Markdown links, reference links, canonical routes and shared tags.
Draft and unlisted content is excluded. Blog posts and wiki documents keep their
actual Docusaurus permalinks, including locale and project base paths. The Wiki
home renders the full graph after its Markdown body. Every other wiki document
and blog detail page renders a local graph before the connection lists, using
the same D3 force simulation and PixiJS approach as Quartz Community's Graph plugin.

The client loads the same upstream browser libraries from jsDelivr as Quartz:

- `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`
- `https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.js`

This avoids runtime graph-layout approximations and large bundled browser
dependencies. The rest of the site remains static and works independently of
these assets. If a browser blocks jsDelivr, the graph page reports that the
renderer could not load while its document index remains available.

The Docusaurus plugin is configured in `docusaurus.config.ts` without path overrides.
Original-theme content wrappers consume its shared global data. There is no
standalone graph content file. `/wiki/graph` is only a static compatibility link
to the Wiki home graph. `/wiki/knowledge/` aliases the `/wiki/d/` subtree.

The same index powers global tag pages and the original-theme wrappers that append
incoming, outgoing and shared-tag connections after document bodies. A graph link
on the Wiki home with `?node=<encoded node id>#document-graph` opens a document's neighborhood. Empty link sections
are omitted. Unresolved Markdown source links are recorded in the generated
`link-diagnostics.json`; Docusaurus remains responsible for broken route validation.
Only static Markdown links are indexed, not computed JSX navigation or JavaScript.

On the graph, hover a node to reveal its title, click to inspect its linked
notes, and drag it to move it. Dragging sends motion into connected nodes, so a
quick back-and-forth shake makes its neighborhood react. Drag the background
to pan and use the wheel or the on-canvas controls to zoom. The interaction
respects the browser's reduced-motion preference.

The rendering and force-graph interaction are adapted from
[`quartz-community/graph`](https://github.com/quartz-community/graph), under
the MIT license. See `THIRD_PARTY_NOTICES.md`.
