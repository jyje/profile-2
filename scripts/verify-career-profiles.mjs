import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCareer} from '../plugins/career-data.cjs';

export async function verifyCareerProfiles(browser, base) {
  const {layout: {profiles}, sources} = loadCareer(process.cwd());
  const screenshotDir = 'output/career-review';
  await fs.mkdir(screenshotDir, {recursive: true});
  for (const locale of ['ko', 'en']) {
    const context = await browser.newContext({locale: locale === 'ko' ? 'ko-KR' : 'en-US', viewport: {width: 1222, height: 900}});
    const root = base + (locale === 'en' ? 'en/' : '');
    const data = sources[locale];
    await context.addCookies([{name: 'jyje_locale', value: locale, url: new URL(base).origin}]);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const selector = page.getByRole('combobox', {name: locale === 'ko' ? '직무 관점' : 'Role focus'});
    const nav = page.getByRole('navigation', {name: locale === 'ko' ? '경력 문서' : 'Career documents'});
    const current = (variant, role) => page.locator(`[data-career-document="${variant}"][data-career-role="${role}"]`);
    for (const [role, profile] of Object.entries(profiles)) {
      for (const variant of ['resume', 'selected-cv']) {
        const response = await page.goto(root + `about/${variant}/?role=${role}`);
        assert.equal(response.status(), 200);
        await current(variant, role).waitFor();
        assert.equal(await selector.inputValue(), role);
        assert.ok((await current(variant, role).innerText()).includes(profile.title));
        assert.deepEqual(await page.locator('[data-career-document] [id^="projects-"]').evaluateAll(nodes => nodes.map(node => Number(node.id.replace('projects-', '')))),
          variant === 'resume' ? profile.resume.projects.map(item => item.index) : profile.selectedCv.projects);
        // Selected CV renders every existing detail for each chosen project.
        if (variant === 'selected-cv') for (const index of profile.selectedCv.projects) {
          const expected = (data.projects[index].roles?.items?.length ?? 0) + (data.projects[index].results?.items?.length ?? 0);
          assert.equal(await page.locator(`#projects-${index} li`).count(), expected);
        }
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({path: `${screenshotDir}/${locale}-${variant}-${role}.png`, fullPage: true});
      }
    }
    // One focused flow covers routing, keyboard use, browser history and Full CV.
    await page.goto(root + 'about/resume/');
    await current('resume', 'platform').waitFor();
    await page.locator('select:not([disabled])').waitFor();
    await selector.focus();
    assert.ok(await selector.evaluate(node => node === document.activeElement));
    await page.keyboard.press('Tab');
    assert.ok(await page.getByRole('button', {name: locale === 'ko' ? '링크 복사' : 'Copy link', exact: true}).evaluate(node => node === document.activeElement));
    // Native popup key sequences differ across OSes; test focus order and change separately.
    await selector.selectOption('agents');
    await current('resume', 'agents').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('role'), 'agents');
    await selector.selectOption('inference'); await current('resume', 'inference').waitFor();
    await page.goBack(); await current('resume', 'agents').waitFor();
    await page.goForward(); await current('resume', 'inference').waitFor();
    await nav.locator('a[href*="/about/selected-cv"]').click(); await current('selected-cv', 'inference').waitFor();
    await nav.locator('a[href*="/about/cv/"]').click();
    await page.locator('[data-career-document="cv"]').waitFor();
    assert.equal(await selector.count(), 0);
    assert.equal(await page.locator('[data-career-document] [id^="projects-"]').count(), data.projects.length);
    await nav.locator('a[href*="/about/resume"]').click(); await current('resume', 'inference').waitFor();

    // The original Docusaurus locale menu must retain the role query.
    const otherRoot = base + (locale === 'ko' ? 'en/' : '');
    const languageLink = page.locator(`a[href*="/about/resume"][href*="role=inference"]`).filter({hasText: locale === 'ko' ? 'English' : '한국어'});
    await page.locator('.navbar .dropdown').filter({has: languageLink}).hover();
    await languageLink.click();
    await current('resume', 'inference').waitFor();
    assert.equal(new URL(page.url()).pathname, new URL(otherRoot + 'about/resume/').pathname);
    assert.equal(new URL(page.url()).searchParams.get('role'), 'inference');
    await page.goto(root + 'about/resume/?role=inference'); await current('resume', 'inference').waitFor();
    await page.evaluate(() => {Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => {window.__careerCopied = text;}}}); window.print = () => {window.__careerPrinted = true;};});
    await page.getByRole('button', {name: locale === 'ko' ? '링크 복사' : 'Copy link', exact: true}).click();
    assert.equal(await page.evaluate(() => window.__careerCopied), page.url());
    await page.getByRole('button', {name: locale === 'ko' ? '인쇄 / PDF 저장' : 'Print / Save PDF'}).click();
    assert.equal(await page.evaluate(() => window.__careerPrinted), true);
    await page.evaluate(() => {navigator.clipboard.writeText = async () => {throw new Error('Clipboard unavailable');};});
    await page.getByRole('button', {name: locale === 'ko' ? '링크 복사' : 'Copy link', exact: true}).click();
    assert.equal(await page.getByRole('textbox', {name: locale === 'ko' ? '공유 링크' : 'Share link'}).inputValue(), page.url());
    await page.goto(root + 'about/resume/?role=unknown'); await current('resume', 'platform').waitFor();
    await page.reload(); await current('resume', 'platform').waitFor();
    for (const variant of ['resume', 'selected-cv', 'cv']) {
      await page.setViewportSize({width: 390, height: 844});
      await page.goto(root + `about/${variant}/?role=inference`);
      await page.locator(`[data-career-document="${variant}"]`).waitFor();
      await page.evaluate(() => {document.documentElement.dataset.theme = 'dark'; return document.fonts.ready;});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${variant}: mobile overflow`);
      await page.screenshot({path: `${screenshotDir}/${locale}-${variant}-mobile-dark.png`, fullPage: true});
    }
    assert.deepEqual(errors, [], `${locale}: browser errors`);
    await context.close();
  }
  console.log('Career profiles passed: both locales, 3 roles, detailed selection, history, document/locale links, clipboard, keyboard, mobile and dark mode.');
}
