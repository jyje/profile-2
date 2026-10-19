import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';

const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], {encoding: 'utf8'});
if (![0, 1].includes(current.status)) throw new Error(current.stderr);
const existing = current.stdout.trim();
if (existing && existing !== '.githooks') throw new Error(`Existing hooksPath ${existing}: integrate explicitly instead of overwriting it`);
for (const hook of ['.githooks/pre-commit', '.githooks/commit-msg']) fs.chmodSync(hook, 0o755);
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks']);
console.log('Installed repository pre-commit and commit-msg hooks. Use Node.js 26+. No commit or staging was performed.');
