import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import tailwindPlugin from '../plugins/tailwind.cjs';
import {cn} from '../src/lib/utils.ts';

const root = path.resolve(import.meta.dirname, '..');

test('theme behavior stays upstream, with only site-specific label and link wrappers', async () => {
  for (const relative of [
    'src/theme/NavbarItem/DropdownNavbarItem/Desktop/index.tsx',
    'src/theme/NavbarItem/DropdownNavbarItem/Mobile/index.tsx',
    'src/theme/NavbarItem/DefaultNavbarItem/index.tsx',
    'src/theme/NavbarItem/LocaleDropdownNavbarItem/index.tsx',
    'src/theme/Tag/styles.module.css',
  ]) {
    await assert.rejects(fs.access(path.join(root, relative)), {code: 'ENOENT'});
  }
  const files = await fs.readdir(path.join(root, 'src/theme'), {recursive: true});
  for (const file of files.filter(file => /\.tsx?$/.test(file))) {
    const source = await fs.readFile(path.join(root, 'src/theme', file), 'utf8');
    assert.doesNotMatch(source, /@docusaurus\/theme-classic\/lib|@docusaurus\/theme-common\/internal/);
  }
  const translations = JSON.parse(await fs.readFile(path.join(root, 'i18n/ko/docusaurus-theme-classic/navbar.json'), 'utf8'));
  assert.deepEqual(Object.values(translations).map(value => value.message), ['블로그', '위키', '실험실', '소개']);
});

test('prefixed utilities merge without consuming existing CSS-module classes', () => {
  assert.equal(cn('tw:px-4', 'tw:px-8', false, 'documentLayout'), 'tw:px-8 documentLayout');
  assert.equal(cn('tw:hover:bg-primary', 'tw:hover:bg-accent'), 'tw:hover:bg-accent');
  assert.equal(cn('button', 'button--secondary'), 'button button--secondary');
});

test('mobile dropdown layout and caret styling remain owned by the theme', async () => {
  const source = await fs.readFile(path.join(root, 'src/css/custom.css'), 'utf8');
  postcss.parse(source).walkRules(rule => {
    assert.doesNotMatch(rule.selector, /\.menu__(?:link|caret|list-item-collapsible)\b/,
      `Do not override upstream menu layout in custom.css: ${rule.selector}`);
  });
});

test('the public PostCSS hook preserves existing plugins and options', () => {
  const existing = {postcssPlugin: 'existing'};
  const options = {plugins: [existing], sourceMap: true};
  const configured = tailwindPlugin().configurePostCss(options);
  assert.equal(configured.plugins[0], existing);
  assert.equal(configured.sourceMap, true);
  assert.equal(configured.plugins.length, 2);
});

test('generated UI CSS is opt-in and uses site tokens without a document reset', async () => {
  const file = path.join(root, 'src/css/shadcn.css');
  const source = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(source, /@import\s+['"]tailwindcss['"]|@import[^;]*preflight/);
  const {root: css} = await postcss([tailwind()]).process(source, {from: file});
  const selectors = [];
  css.walkRules(rule => selectors.push(rule.selector));
  assert.ok(selectors.includes('.tw\\:inline-flex'));
  assert.ok(selectors.includes('.tw\\:bg-primary'));
  assert.ok(selectors.includes('.tw\\:rounded-full'));
  assert.ok(selectors.includes('.tw\\:w-full'));
  assert.ok(!selectors.some(selector => /(^|,\s*)(body|h1|p|ul|button|\.container|\.button)(\s|,|$)/.test(selector)));
  const primary = css.nodes.flatMap(node => node.nodes ?? []).find(node => node.selector === '.tw\\:bg-primary');
  assert.ok(primary?.toString().includes('var(--ifm-color-primary)'));
  assert.ok(css.toString().includes("[data-theme='dark']"));
});

test('retired NIM code and configuration cannot re-enter the build', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies['@langchain/core'], undefined);
  for (const relative of ['src/components/NimLab/index.tsx', 'static/labs/nim/python-worker.mjs']) {
    await assert.rejects(fs.access(path.join(root, relative)), {code: 'ENOENT'});
  }
  for (const relative of ['docusaurus.config.ts', '.github/workflows/publish-github-pages.yaml']) {
    assert.doesNotMatch(await fs.readFile(path.join(root, relative), 'utf8'), /NIM_RELAY_URL|nimRelayUrl/);
  }
});
