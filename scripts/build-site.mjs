import {spawn} from 'node:child_process';
import {withBuildLock} from './build-lock.mjs';
import path from 'node:path';
import {prepareBuildContext} from './build-context.mjs';
import {syncAll} from './sync-content.mjs';
import {contentMode} from '../plugins/content-visibility.cjs';
import {runContentFormat} from './content-format.mjs';
import {runDesignLint} from './design-system/lint.mjs';

await withBuildLock(async () => {
  if (contentMode() === 'public') {
    const root = path.resolve(import.meta.dirname, '..');
    const content = await runContentFormat({root});
    const design = await runDesignLint(root);
    if (content.failures.length || design.errors.length) throw new Error([...content.failures, ...design.errors].join('\n'));
  }
  prepareBuildContext(path.resolve(import.meta.dirname, '..'), {
    url: process.env.SITE_URL ?? 'https://jyje.online',
    baseUrl: process.env.SITE_BASE_URL ?? '/',
    remote: process.env.LABS_REMOTE_ENTRY ?? '',
    contentMode: contentMode(),
    outputLayout: 'directory-index-v1',
  });
  // Sync and bundling share one lock because both change generated inputs.
  syncAll();
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
