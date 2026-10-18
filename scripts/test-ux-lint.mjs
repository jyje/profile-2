import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as yaml from 'js-yaml';
import {breadcrumbRule as rule, breadcrumbViolations} from './ux-lint-contract.mjs';

function fixture(paneLeft = 0) {
  return {count: 1, frames: 1, paneLeft, navbarBottom: 60,
    nav: {x: paneLeft + 16, y: 76},
    home: {x: paneLeft + 16 + rule.home.x, y: 76 + rule.home.y, width: rule.home.width, height: rule.home.height}};
}
test('UX-001 has one coordinate contract with and without a sidebar', () => {
  for (const left of [0, 240, 300, 326, 382.5]) assert.deepEqual(breadcrumbViolations(fixture(left)), []);
});
test('UX-001 rejects shifted frames, icons, duplicates, hero nesting and overflow', () => {
  for (const change of [g => g.nav.x += 2, g => g.nav.y += 2, g => g.home.x += 2,
    g => g.home.width = 0, g => g.count++, g => g.frames = 0, g => g.inHero = true, g => g.overflow = true]) {
    const g = fixture(); change(g); assert.ok(breadcrumbViolations(g).length);
  }
});

test('authored pages declare navigation data instead of placing breadcrumbs inside content', async () => {
  for (const root of ['src/pages', 'i18n/en/docusaurus-plugin-content-pages']) {
    const files = (await fs.readdir(root, {recursive: true})).filter(name => /\.mdx?$/.test(name));
    for (const name of files) {
      const text = await fs.readFile(`${root}/${name}`, 'utf8');
      const front = yaml.load(text.split('---')[1]);
      if (front.wrapperClassName === 'site-labs-page' && /<FederatedLabs\b/.test(text)) {
        assert.doesNotMatch(text, /<SiteBreadcrumbs|<BreadcrumbFrame/, 'Labs host owns dynamic placement');
        continue;
      }
      assert.ok(Array.isArray(front.breadcrumbs) && front.breadcrumbs.length > 0, name);
      assert.ok(front.breadcrumbs.every(item => typeof item.label === 'string' && item.label.trim()), name);
      assert.equal(front.breadcrumbs.at(-1).href, undefined, 'Current item is not a link');
      assert.doesNotMatch(text, /<SiteBreadcrumbs|<BreadcrumbFrame/, 'MDX supplies data, not placement');
    }
  }
});

test('PR and Pages workflows gate publication on screenshot UX lint', async () => {
  for (const name of ['ci.yaml', 'publish-github-pages.yaml']) {
    const workflow = yaml.load(await fs.readFile(`.github/workflows/${name}`, 'utf8'));
    const steps = workflow.jobs.build.steps;
    const lint = steps.findIndex(step => step.run === 'npm run lint:ux');
    assert.ok(lint > steps.findIndex(step => /npm run build/.test(step.run ?? '')), name);
    assert.ok(steps.some(step => step.if === 'always()' && /ux-lint/.test(step.with?.path ?? '')), name);
    if (name.startsWith('publish')) {
      assert.ok(lint < steps.findIndex(step => step.uses?.startsWith('actions/upload-pages-artifact@')));
      assert.ok(steps[lint].env.VERIFY_BASE_PATH.includes('steps.pages.outputs.base_path'));
    }
  }
});
