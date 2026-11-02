'use strict';
// Bounded mitigation for GHSA-g3hv-75wg-m249, not a patched upstream release.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const hash = '746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d';
const patternGuard = `  // profile-2: bound legacy pattern complexity (GHSA-g3hv-75wg-m249)
  if (pattern.length > 8192 || pattern.split('/').length > 128 || (pattern.match(/\\*\\*/g) || []).length > 16 || (pattern.match(/\\{/g) || []).length > 32) {
    throw new RangeError('Pattern exceeds legacy serving complexity limit')
  }
`;
const partsGuard = `  // profile-2: bound globparts before allocation (GHSA-g3hv-75wg-m249)
  var partBudget = 8192
  for (var budgetIndex = 0; budgetIndex < set.length; budgetIndex++) {
    partBudget--
    for (var charIndex = 0; charIndex < set[budgetIndex].length; charIndex++) {
      if (set[budgetIndex][charIndex] === '/') partBudget--
      if (partBudget < 0) throw new RangeError('Expanded pattern exceeds serving part budget')
    }
  }
`;
const expansion = `var boundedExpansion = expand(pattern, {max: 257})
  if (boundedExpansion.length > 256 || boundedExpansion.reduce(function (sum, value) { return sum + value.length }, 0) > 65536) {
    throw new RangeError('Brace expansion exceeds serving budget')
  }
  return boundedExpansion`;
function patchMinimatch(root = path.resolve(__dirname, '..'), {check = false} = {}) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  const entries = Object.entries(lock.packages).filter(([key]) => /(?:^|\/)node_modules\/minimatch$/.test(key));
  if (!entries.length) throw new Error('Review and retire minimatch mitigation: dependency disappeared');
  for (const [relative, item] of entries) {
    if (item.version !== '3.1.5') throw new Error('Review minimatch mitigation for changed version');
    const file = path.join(root, relative, 'minimatch.js');
    const current = fs.readFileSync(file, 'utf8');
    const original = current.replace(patternGuard, '').replace(partsGuard, '').replace(expansion, 'return expand(pattern)');
    if (createHash('sha256').update(original).digest('hex') !== hash) throw new Error('Unexpected minimatch source; review upstream integrity');
    const patched = original.replace('  if (pattern.length > MAX_PATTERN_LENGTH)', patternGuard + '  if (pattern.length > MAX_PATTERN_LENGTH)')
      .replace('  set = this.globParts = set.map', partsGuard + '  set = this.globParts = set.map')
      .replace('return expand(pattern)', expansion);
    if (check && current !== patched) throw new Error('Missing minimatch mitigation: run npm ci');
    if (!check && current !== patched) fs.writeFileSync(file, patched);
  }
  return entries.length;
}
module.exports = {patchMinimatch};
