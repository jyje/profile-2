import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

// Render a 1200x630 social card for an Anatomy figure: static/img/figures/<name>/thumbnail.png.
// Reference it from a document with `image: /img/figures/<name>/thumbnail.png`.
async function launch() {
  try { return await chromium.launch(); } catch { return chromium.launch({channel: 'chrome'}); }
}

export async function writeThumbnail(root, name) {
  const source = path.join(root, 'static/img/figures', name, 'light', 'index.html');
  if (!fs.existsSync(source)) throw new Error(`Missing ${path.relative(root, source)}; run npm run build:anatomy -- ${name}`);
  const output = path.join(root, 'static/img/figures', name, 'thumbnail.png');
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
    await page.goto(pathToFileURL(source).href);
    await page.addStyleTag({content: 'html,body{height:100%}body{display:grid;place-items:center}.iso-page{width:min(660px,100%)!important;margin:0!important}.iso-legend{display:none!important}'});
    await page.waitForSelector('.iso-plate');
    await page.waitForTimeout(700);
    await page.screenshot({path: output});
  } finally { await browser.close(); }
  return path.relative(root, output).replaceAll('\\', '/');
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  const name = process.argv[2];
  if (!name) { console.error('Usage: node scripts/anatomy-thumbnail.mjs <name>'); process.exit(1); }
  console.log(`wrote ${await writeThumbnail(path.resolve(import.meta.dirname, '..'), name)}`);
}
