'use strict';
// Temporary mitigation for GHSA-gcqx-w48m-w2h4, not an upstream fixed version.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const hashes = {
  'index.js': '12440c84957c1990ea2d5e33dc0091722dc1dc1585c6d20e0c780e568ffa9d30',
  'dist/cjs.js': '2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d',
  'dist/umd.js': 'f33e6596482d1fb5c7c427f8ef92f2aa849eea9223acd974176b2fb27ddbf73a',
};
const marker = '// profile-2: define own merge keys (GHSA-gcqx-w48m-w2h4)';
function patchDeepmerge(root = path.resolve(__dirname, '..'), {check = false} = {}) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  const entries = Object.entries(lock.packages).filter(([key]) => /(?:^|\/)node_modules\/deepmerge$/.test(key));
  if (!entries.length) throw new Error('Review and retire deepmerge mitigation: dependency disappeared');
  for (const [relative, item] of entries) {
    if (item.version !== '4.3.1') throw new Error('Review deepmerge mitigation for changed version');
    for (const [name, hash] of Object.entries(hashes)) {
      const file = path.join(root, relative, name);
      const current = fs.readFileSync(file, 'utf8');
      const original = current.replaceAll(`${marker}\n`, '').replace(/Object\.defineProperty\(destination, key, \{value: (.*), enumerable: true, configurable: true, writable: true\}\)/g, 'destination[key] = $1');
      if (createHash('sha256').update(original).digest('hex') !== hash) throw new Error('Unexpected deepmerge source; review upstream integrity');
      const patched = marker + '\n' + original.replace(/destination\[key\] = ([^\n;]+)(;?)/g, 'Object.defineProperty(destination, key, {value: $1, enumerable: true, configurable: true, writable: true})$2');
      if (check && current !== patched) throw new Error('Missing deepmerge mitigation: run npm ci');
      if (!check && current !== patched) fs.writeFileSync(file, patched);
    }
  }
  return entries.length;
}
module.exports = {patchDeepmerge};
