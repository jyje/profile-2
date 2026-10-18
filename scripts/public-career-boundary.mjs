import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {brotliDecompressSync, gunzipSync} from 'node:zlib';

export function verifyPublicCareerBoundary(output) {
  let checked = 0;
  for (const relative of fs.readdirSync(output, {recursive: true})) {
    const file = path.join(output, relative);
    if (!fs.statSync(file).isFile()) continue;
    assert.doesNotMatch(relative, /(?:^|\/)(?:resume\.(?:ko|en)|career-layout)\.json$/);
    assert.doesNotMatch(relative, /(?:^|\/)(?:resume|selected-cv|cv)(?:[-_.\/].*)?\.pdf$/i,
      `Career export must not be served publicly: ${relative}`);
    const plain = relative.replace(/\.(?:gz|br)$/, '');
    if (!/\.(?:html|js|json|xml|map|txt)$/.test(plain)) continue;
    let bytes = fs.readFileSync(file);
    if (relative.endsWith('.gz')) bytes = gunzipSync(bytes);
    if (relative.endsWith('.br')) bytes = brotliDecompressSync(bytes);
    const text = bytes.toString('utf8').replaceAll('\\/', '/');
    assert.doesNotMatch(text,
      /data-career-document|data-career-role|SYNTHETIC_PRIVATE_CAREER_SENTINEL|src\/generated\/(?:resume\.(?:ko|en)|career-layout)|"kind"\s*:\s*"resume"/,
      `Retired career payload found in ${relative}`);
    checked++;
  }
  assert.ok(checked > 0, 'No public output files checked');
  return checked;
}
