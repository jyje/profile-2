import path from 'node:path';
import lockfile from 'proper-lockfile';

export async function withBuildLock(task, root = path.resolve(import.meta.dirname, '..')) {
  const release = await lockfile.lock(path.join(root, 'package.json'), {
    lockfilePath: path.join(root, '.profile2-build.lock'),
    stale: 600_000,
    update: 10_000,
    retries: {retries: 120, factor: 1, minTimeout: 1000, maxTimeout: 1000},
  });
  try { return await task(); } finally { await release(); }
}
