const fs = require('node:fs/promises');
const path = require('node:path');

// A static compatibility document, not a graph route or a graph content node.
// Unlike a redirect with a fixed hash, this preserves both query and old hash.
module.exports = function wikiGraphRedirect() {
  return {
    name: 'wiki-graph-redirect',
    async postBuild({outDir, baseUrl}) {
      const target = `${baseUrl}wiki/`;
      const output = path.join(outDir, 'wiki/graph/index.html');
      await fs.mkdir(path.dirname(output), {recursive: true});
      await fs.writeFile(output, `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0;url=${target}#document-graph"><title>Wiki graph</title></head><body><a href="${target}#document-graph">Open the wiki graph</a><script>location.replace(${JSON.stringify(target)}+location.search+(location.hash||'#document-graph'))</script></body></html>`);
    },
  };
};
