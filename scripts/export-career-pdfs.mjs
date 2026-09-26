// Build all locales first, then run against a static server with PDF_BASE_URL.
// The default local origin is the all-locale development server.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const base = new URL(process.env.PDF_BASE_URL ?? 'http://127.0.0.1:3000/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const output = path.resolve('output/pdf');
await fs.mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true});
const report = [];
try {
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', viewport: {width: 1200, height: 900}});
    await context.addCookies([{name: 'jyje_locale', value: locale, url: base.origin}]);
    const page = await context.newPage();
    page.on('response', response => { if (response.status() >= 400) console.error(`HTTP ${response.status()}: ${response.url()}`); });
    page.on('requestfailed', request => console.error(`Failed request: ${request.url()} (${request.failure()?.errorText})`));
    for (const variant of ['resume', 'cv']) {
      const url = new URL(`${locale === 'en' ? 'en/' : ''}about/${variant}`, base);
      const response = await page.goto(url.href, {waitUntil: 'networkidle'});
      if (!response?.ok()) throw new Error(`Career route failed: ${url} (${response?.status()})`);
      await page.locator(`[data-career-document="${variant}"]`).waitFor();
      await page.emulateMedia({media: 'print', colorScheme: 'light'});
      await page.evaluate(() => Promise.all([document.fonts.load('12px "Noto Sans KR"', '한글 ABC'), document.fonts.load('700 12px "Noto Sans KR"', '한글 ABC')]));
      await page.evaluate(() => document.fonts.ready);
      if (!await page.evaluate(() => document.fonts.check('12px "Noto Sans KR"', '한글 ABC'))) throw new Error('Career font did not load');
      await page.evaluate(async () => Promise.all([...document.images].map(image => image.decode().catch(() => {}))));
      const file = path.join(output, `jeayoung-jeon-${variant}-${locale}.pdf`);
      await page.pdf({path: file, format: 'A4', preferCSSPageSize: true, printBackground: true,
        displayHeaderFooter: variant === 'cv', headerTemplate: '<span></span>',
        footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#405863">Jeayoung Jeon · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
      const pdf = await PDFDocument.load(await fs.readFile(file));
      const pages = pdf.getPageCount();
      if (variant === 'resume' && pages !== 1) throw new Error(`${locale} resume is ${pages} pages. Edit data/career-layout.yml or print layout; do not clip content or scale down automatically.`);
      if (variant === 'cv' && pages < 2) throw new Error(`${locale} CV unexpectedly contains ${pages} page.`);
      for (const p of pdf.getPages()) {
        const {width, height} = p.getSize();
        if (Math.abs(width - 595.28) > 2 || Math.abs(height - 841.89) > 2) throw new Error(`Non-A4 page in ${file}`);
      }
      const loadingTask = getDocument({data: new Uint8Array(await fs.readFile(file)), useSystemFonts: false});
      const parsed = await loadingTask.promise;
      const text = [];
      for (let index = 1; index <= parsed.numPages; index++) {
        const p = await parsed.getPage(index);
        const content = await p.getTextContent();
        const strings = content.items.filter(item => 'str' in item && item.str.trim());
        if (strings.map(item => item.str).join('').length < 80) throw new Error(`Blank or nearly empty page ${index} in ${file}`);
        for (const item of strings) {
          const [,,,,x,y] = item.transform;
          if (x < -1 || y < -1 || x + item.width > p.view[2] + 1 || y > p.view[3] + 1) throw new Error(`Text outside page ${index} in ${file}`);
        }
        text.push(strings.map(item => item.str).join(' '));
      }
      if (!text.join(' ').includes(locale === 'ko' ? '전제영' : 'Jeayoung Jeon')) throw new Error(`Missing searchable name in ${file}`);
      await loadingTask.destroy();
      report.push({locale, variant, pages, file: path.basename(file)});
    }
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
