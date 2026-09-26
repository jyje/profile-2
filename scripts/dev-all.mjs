// Serve every locale from one origin and rebuild the complete site on changes.
// Docusaurus start supports one locale per process, so the default development
// view uses its multi-locale build with automatic browser reload instead.
// Keep the previous successful build available while the next one compiles.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import handler from 'serve-handler';
import {shouldRebuild} from './source-watch.mjs';

const root = path.resolve(import.meta.dirname, '..');
const ownedRoot = path.join(root, '.dev-all');
const marker = path.join(ownedRoot, '.owner');
const slots = [path.join(ownedRoot, 'slot-a'), path.join(ownedRoot, 'slot-b')];
const ownerText = 'profile-2 dev-all build output v1\n';
const host = '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
const baseUrl = `/${(process.env.SITE_BASE_URL ?? '/').split('/').filter(Boolean).join('/')}`.replace(/\/$/, '') + '/';
const eventsPath = `${baseUrl}__dev_all_events`;
const clients = new Set();
const watchers = [];
let currentSlot = -1;
let generation = '';
let building = false;
let queued = false;
let debounceTimer;
let buildProcess;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

function prepareOwnedRoot() {
  if (fs.existsSync(ownedRoot)) {
    if (!fs.existsSync(marker) || fs.readFileSync(marker, 'utf8') !== ownerText) {
      throw new Error(`Refusing to clean an unowned directory: ${ownedRoot}`);
    }
  } else {
    fs.mkdirSync(ownedRoot);
    fs.writeFileSync(marker, ownerText);
  }
}

function injectReloadScript(directory) {
  const script = `<script data-dev-all-reload>(function(){var key=${JSON.stringify(`jyje-dev-all-generation:${baseUrl}`)};var last;try{last=sessionStorage.getItem(key)}catch(e){}var source=new EventSource(${JSON.stringify(eventsPath)});source.onmessage=function(event){if(last&&last!==event.data){try{sessionStorage.setItem(key,event.data)}catch(e){}location.reload()}else{last=event.data;try{sessionStorage.setItem(key,last)}catch(e){}}}})();</script>`;

  function walk(directoryPath) {
    for (const entry of fs.readdirSync(directoryPath, {withFileTypes: true})) {
      const absolute = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith('.html')) {
        const html = fs.readFileSync(absolute, 'utf8');
        if (html.includes('</body>')) {
          fs.writeFileSync(absolute, html.replace('</body>', `${script}</body>`));
        }
      }
    }
  }

  walk(directory);
}

function buildInto(slot) {
  const destination = slots[slot];
  fs.rmSync(destination, {recursive: true, force: true});
  return new Promise((resolve) => {
    const relative = path.relative(root, destination);
    buildProcess = spawn('npm', ['run', 'build', '--', '--out-dir', relative], {
      cwd: root,
      env: {...process.env, LABS_REMOTE_ENTRY: process.env.LABS_REMOTE_ENTRY ?? 'local'},
      stdio: 'inherit',
    });
    buildProcess.once('error', (error) => {
      console.error('[dev-all] build could not start:', error);
      buildProcess = undefined;
      resolve(false);
    });
    buildProcess.once('exit', (code) => {
      buildProcess = undefined;
      resolve(code === 0);
    });
  });
}

function sendGeneration(response) {
  response.write(`data: ${generation}\n\n`);
}

function announceBuild() {
  generation = String(Date.now());
  for (const response of clients) {
    try {
      sendGeneration(response);
    } catch {
      clients.delete(response);
    }
  }
}

async function rebuild() {
  if (building) {
    queued = true;
    return false;
  }
  building = true;
  const nextSlot = currentSlot === 0 ? 1 : 0;
  console.log('[dev-all] building Korean and English pages...');
  try {
    if (!await buildInto(nextSlot)) {
      console.error('[dev-all] build failed; continuing to serve the last successful build');
      return false;
    }
    injectReloadScript(slots[nextSlot]);
    currentSlot = nextSlot;
    announceBuild();
    console.log('[dev-all] both locales ready');
    return true;
  } catch (error) {
    console.error('[dev-all] build failed:', error);
    return false;
  } finally {
    building = false;
    if (queued) {
      queued = false;
      scheduleBuild();
    }
  }
}

function scheduleBuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    void rebuild();
  }, 500);
}

function watchSources() {
  for (const name of ['content', 'data', 'src', 'plugins', 'static', 'scripts', 'i18n']) {
    const directory = path.join(root, name);
    if (!fs.existsSync(directory)) continue;
    const watcher = fs.watch(directory, {recursive: true}, (_event, filename) => {
      if (!shouldRebuild(name, filename)) return;
      scheduleBuild();
    });
    watchers.push(watcher);
  }
  for (const name of ['docusaurus.config.ts', 'sidebars.ts', 'package.json']) {
    const filename = path.join(root, name);
    const listener = (current, previous) => {
      if (current.mtimeMs !== previous.mtimeMs) scheduleBuild();
    };
    fs.watchFile(filename, {interval: 500}, listener);
    watchers.push({close: () => fs.unwatchFile(filename, listener)});
  }
}

function createServer() {
  return http.createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname === eventsPath) {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      clients.add(response);
      sendGeneration(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    if (!pathname.startsWith(baseUrl)) {
      response.writeHead(302, {Location: baseUrl});
      response.end();
      return;
    }
    if (currentSlot < 0) {
      response.writeHead(503);
      response.end('Building the site');
      return;
    }
    if (baseUrl !== '/') request.url = request.url.replace(baseUrl, '/');
    response.setHeader('Cache-Control', 'no-store');
    handler(request, response, {
      cleanUrls: true,
      directoryListing: false,
      public: slots[currentSlot],
    }).catch((error) => {
      console.error('[dev-all] request failed:', error);
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
}

prepareOwnedRoot();
if (!await rebuild()) process.exit(1);
const server = createServer();
server.listen(port, host, () => {
  console.log(`[dev-all] all locales and pages: http://localhost:${port}${baseUrl}`);
  console.log('[dev-all] watching sources; successful builds reload open pages');
  watchSources();
});

function shutdown() {
  clearTimeout(debounceTimer);
  for (const watcher of watchers) watcher.close();
  if (buildProcess) buildProcess.kill('SIGTERM');
  for (const response of clients) response.end();
  server.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
