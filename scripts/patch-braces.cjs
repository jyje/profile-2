'use strict';

// Temporary mitigation for GHSA-vfj7-8cjw-p6xm, not an upstream fixed release.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');

const originalHashes = {
  'parse.js': 'e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310',
  'compile.js': 'dc98f22eee3d511785d92a00758d5f0d48efed5f5813bdecc2de430c529b5c9f',
  'expand.js': '41ccc196ebfa7b7781a634e721eb744e4e7bcb54cba427a7e3d6806a1b9e58f7',
  'stringify.js': '379f22d77bfa1478341ccd49c5e4267464aabcbba03558bab332aac23fc6f23a',
};
const marker = '// profile-2: bounded braces recursion (GHSA-vfj7-8cjw-p6xm)';
const guard = `${marker}
const assertDepth = (ast) => {
  const pending = [[ast, 0]];
  const seen = new Set();
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (depth > 100 || seen.has(node)) throw new SyntaxError('Brace AST exceeds maximum depth (100) or contains a cycle');
    seen.add(node);
    if (node && node.nodes) for (const child of node.nodes) pending.push([child, depth + 1]);
  }
};
`;

function patchBraces(root = path.resolve(__dirname, '..'), {check = false} = {}) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const entries = Object.entries(lock.packages).filter(([name]) => /(?:^|\/)node_modules\/braces$/.test(name));
  if (!entries.length) throw new Error('Expected braces dependency disappeared: review and retire the mitigation');
  for (const [relative, metadata] of entries) {
    if (metadata.version !== '3.0.3') throw new Error(`Review braces mitigation for ${metadata.version}`);
    for (const [name, hash] of Object.entries(originalHashes)) {
      const file = path.join(root, relative, 'lib', name);
      const current = fs.readFileSync(file, 'utf8');
      // Reverse exactly our changes before checking the original integrity.
      const original = name === 'parse.js'
        ? current.replaceAll(`      ${marker}\n      if (stack.length >= 100) throw new SyntaxError('Brace nesting exceeds maximum depth (100)');\n`, '')
        : current.replace(guard, '').replace('  assertDepth(ast);\n', '');
      if (createHash('sha256').update(original).digest('hex') !== hash) {
        throw new Error(`Unexpected braces source: ${file}. Review upstream changes before applying the mitigation.`);
      }
      const patched = name === 'parse.js'
        ? original.replaceAll('      stack.push(block);', `      ${marker}\n      if (stack.length >= 100) throw new SyntaxError('Brace nesting exceeds maximum depth (100)');\n      stack.push(block);`)
        : original.replace("'use strict';\n", "'use strict';\n" + guard)
          .replace('(ast, options = {}) => {', '(ast, options = {}) => {\n  assertDepth(ast);');
      if (check && current !== patched) throw new Error(`Missing braces depth mitigation: ${file}. Run npm ci with lifecycle scripts enabled.`);
      if (!check && current !== patched) fs.writeFileSync(file, patched);
    }
  }
  return entries.length;
}

module.exports = {patchBraces};
if (require.main === module) console.log(`[security] braces depth mitigation: ${patchBraces()} installation(s)`);
