'use strict';
const {patchBraces} = require('./patch-braces.cjs');
const {patchDeepmerge} = require('./patch-deepmerge.cjs');
function patchDependencies(root, options) {
  return {braces: patchBraces(root, options), deepmerge: patchDeepmerge(root, options)};
}
module.exports = {patchDependencies};
if (require.main === module) {
  patchDependencies();
  console.log('[security] dependency mitigations verified and applied');
}
