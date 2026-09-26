import {spawn} from 'node:child_process';

// Local entrypoints opt in explicitly; npm run build stays publication-safe.
const child = spawn('npm', process.argv.slice(2), {
  stdio: 'inherit', env: {...process.env, SITE_CONTENT_MODE: 'development'},
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
