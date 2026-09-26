import path from 'node:path';
import lockfile from 'proper-lockfile';

export async function withBuildLock(task, root = path.resolve(import.meta.dirname, '..')) {
  const target = path.join(root, 'package.json');
  const lockfilePath = path.join(root, '.profile2-build.lock');
  if (await lockfile.check(target, {lockfilePath, stale: 600_000})) console.log('[build-lock] waiting for the current build/sync to finish');
  const release = await lockfile.lock(target, {
    lockfilePath,
    stale: 600_000,
    update: 10_000,
    retries: {forever: true, factor: 1, minTimeout: 1000, maxTimeout: 1000},
  });
  try { return await task(); } finally { await release(); }
}
