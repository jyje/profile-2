# Document Graph Docusaurus plugin

This local Docusaurus plugin reads the wiki Markdown for the active locale and
generates document-and-tag graph data during the site build. The Wiki docs page
at `/wiki/graph` imports that data and renders it with the D3 force simulation
and PixiJS canvas approach used by Quartz Community's Graph plugin. Keeping the
page in the docs collection gives it the standard Wiki sidebar and mobile
navigation.

The client loads the same upstream browser libraries from jsDelivr as Quartz:

- `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`
- `https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.js`

This avoids runtime graph-layout approximations and large bundled browser
dependencies. The rest of the site remains static and works independently of
these assets. If a browser blocks jsDelivr, the graph page reports that the
renderer could not load while its document index remains available.

The Docusaurus plugin is configured in `docusaurus.config.ts`. Its options are
`defaultDocsPath`, `englishDocsPath`, `translatedDocsPath`, and
`koreanDocsPath`. The localized MDX pages in `content/{ko,en}/wiki/graph.mdx`
import the generated `graph.json` file.

On the graph, hover a node to reveal its title, click to inspect its linked
notes, and drag it to move it. Dragging sends motion into connected nodes, so a
quick back-and-forth shake makes its neighborhood react. Drag the background
to pan and use the wheel or the on-canvas controls to zoom. The interaction
respects the browser's reduced-motion preference.

The rendering and force-graph interaction are adapted from
[`quartz-community/graph`](https://github.com/quartz-community/graph), under
the MIT license. See `THIRD_PARTY_NOTICES.md`.
