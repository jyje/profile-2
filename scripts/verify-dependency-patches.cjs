'use strict';
// Fail-closed guard for the reviewed dependency mitigations.
//
// The mitigations are pnpm patches (patches/*.patch, listed under patchedDependencies in
// pnpm-workspace.yaml). pnpm applies them while installing and records their hashes in
// pnpm-lock.yaml. This guard proves that every installed copy is the exact reviewed result,
// so an install that skipped, reordered or tampered with a patch cannot build or serve the site.
//
// Hashes are of the patched files. They were checked byte for byte against the former
// postinstall mitigation (scripts/patch-*.cjs, removed), so behavior is unchanged.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const project = path.resolve(__dirname, '..');

const mitigations = {
  braces: {
    version: '3.0.3',
    advisory: 'GHSA-vfj7-8cjw-p6xm',
    files: {
      'lib/parse.js': '6362aa055699bca285d16bc1d9bf6d5849443a36310e76bb3066c77f7ab95a40',
      'lib/compile.js': '06cd10f4f1e6aab78cabb134ba4e643ccb641bd9d2bba915d8c342493d5734da',
      'lib/expand.js': '70d9468acee05c01ac9006f6ca75958d8fbbad2d9af7e43416af663af7d624d1',
      'lib/stringify.js': '52b2e89b2f5c47efd39898c530667cc27b62c0b981a61b6e2c5918de17bd4799',
    },
  },
  deepmerge: {
    version: '4.3.1',
    advisory: 'GHSA-gcqx-w48m-w2h4',
    files: {
      'index.js': 'bab283d0b4f36a551139a1a033ef8716c5449216046f58497c8bd4fc26ed07bc',
      'dist/cjs.js': '0cd5b9bccd72ee187d28387518f3b30e5ed45f3c728ed42aff6c93137ab2f75b',
      'dist/umd.js': '3f31eee9148d3b662598ba5024864a87479d1c6aab82e1193f07962a02e6f444',
    },
  },
  minimatch: {
    version: '3.1.5',
    advisory: 'GHSA-g3hv-75wg-m249',
    files: {
      'minimatch.js': 'a2e8c9f04b0d4cbb6405cf92bd04baabd40afe56025e0205e17827ce4cf25c20',
    },
  },
};

// pnpm keeps every installed copy under node_modules/.pnpm/<name>@<version>[_suffix]/node_modules/<name>.
function installedCopies(root, name) {
  const store = path.join(root, 'node_modules', '.pnpm');
  if (!fs.existsSync(store)) throw new Error('Missing node_modules/.pnpm: run pnpm install --frozen-lockfile');
  const prefix = `${name.replace('/', '+')}@`;
  return fs.readdirSync(store)
    .filter(entry => entry.startsWith(prefix) && /^\d/.test(entry.slice(prefix.length)))
    .map(entry => path.join(store, entry, 'node_modules', name))
    .filter(directory => fs.existsSync(path.join(directory, 'package.json')));
}

function verifyDependencyPatches(root = project) {
  let installations = 0;
  for (const [name, mitigation] of Object.entries(mitigations)) {
    const copies = installedCopies(root, name);
    if (!copies.length) throw new Error(`Review and retire ${name} mitigation: dependency disappeared`);
    for (const directory of copies) {
      const {version} = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
      if (version !== mitigation.version) throw new Error(`Review ${name} mitigation for ${version}`);
      for (const [file, expected] of Object.entries(mitigation.files)) {
        const target = path.join(directory, file);
        const actual = fs.existsSync(target) ? createHash('sha256').update(fs.readFileSync(target)).digest('hex') : null;
        if (actual !== expected) {
          throw new Error(`Missing or unexpected ${name} mitigation (${mitigation.advisory}) in ${file}: run pnpm install --frozen-lockfile`);
        }
      }
      installations += 1;
    }
  }
  return installations;
}

module.exports = {verifyDependencyPatches, installedCopies, mitigations};
if (require.main === module) console.log(`[security] dependency mitigations verified in ${verifyDependencyPatches()} installation(s)`);
