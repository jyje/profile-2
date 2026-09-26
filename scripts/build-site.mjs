import {spawn} from 'node:child_process';
import {withBuildLock} from './build-lock.mjs';

await withBuildLock(async () => {
  // Sync and bundling share one lock because both change generated inputs.
  await import('./sync-content.mjs');
  const child = spawn(process.execPath, ['node_modules/@docusaurus/core/bin/docusaurus.mjs', 'build', ...process.argv.slice(2)], {stdio: 'inherit'});
  const stop = signal => child.kill(signal);
  const onTerm = () => stop('SIGTERM'); const onInt = () => stop('SIGINT');
  process.on('SIGTERM', onTerm); process.on('SIGINT', onInt);
  try {
    await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', code => { process.exitCode = code ?? 1; resolve(); });
    });
  } finally { process.off('SIGTERM', onTerm); process.off('SIGINT', onInt); }
});
