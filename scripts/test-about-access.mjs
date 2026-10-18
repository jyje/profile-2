import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gzipSync, brotliCompressSync} from 'node:zlib';
import {test} from 'node:test';
import {syncPublicData} from './public-data.mjs';
import {verifyPublicCareerBoundary} from './public-career-boundary.mjs';
import * as yaml from 'js-yaml';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'public-about-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const write = (file, text) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, text);
  };
  return {root, write};
}

test('public synchronization works without private sources and retires stale career payloads', t => {
  const {root, write} = fixture(t);
  write('data/tags.yml', 'tags: {}');
  write('data/career/private.yaml', 'SYNTHETIC_PRIVATE_CAREER_SENTINEL: true\nunknownPrivateField: true');
  write('data/unapproved.yml', 'unknownPrivateField: SYNTHETIC_PRIVATE_CAREER_SENTINEL');
  for (const file of ['resume.ko.json', 'resume.en.json', 'career-layout.json']) {
    write(`src/generated/${file}`, 'SYNTHETIC_PRIVATE_CAREER_SENTINEL');
  }
  syncPublicData(root);
  assert.deepEqual(fs.readdirSync(path.join(root, 'src/generated')), ['tags.json']);
  fs.rmSync(path.join(root, 'data/career'), {recursive: true});
  syncPublicData(root);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'src/generated/tags.json'))), {tags: {}});
});

test('output scan checks compressed and normal representations', t => {
  const {root, write} = fixture(t);
  write('index.html', '<h1>Public access instructions</h1>');
  assert.equal(verifyPublicCareerBoundary(root), 1);
  for (const [file, value] of [
    ['leak.js', Buffer.from('SYNTHETIC_PRIVATE_CAREER_SENTINEL')],
    ['leak.json.gz', gzipSync('SYNTHETIC_PRIVATE_CAREER_SENTINEL')],
    ['leak.html.br', brotliCompressSync('data-career-document')],
  ]) {
    write(file, value);
    assert.throws(() => verifyPublicCareerBoundary(root), /Retired career payload/);
    fs.unlinkSync(path.join(root, file));
  }
  write('resume-en.pdf', '%PDF-synthetic-fixture');
  assert.throws(() => verifyPublicCareerBoundary(root), /Career export must not be served publicly/);
});

test('retired private source and public export artifacts cannot re-enter the app', () => {
  const typeConfig = fs.readFileSync('tsconfig.json', 'utf8');
  assert.match(typeConfig, /"exclude":\s*\[[^\]]*"hidden"/, 'Local-only retained sources must not enter the public typecheck');
  for (const file of ['plugins/career-data.cjs', 'src/components/Resume/index.tsx',
    'src/components/ResumeSummary/index.tsx', 'src/components/SelectedCV/index.tsx',
    'src/components/CareerDocuments/profiles.ts', 'scripts/export-career-pdfs.mjs']) {
    assert.equal(fs.existsSync(file), false, file);
  }
  assert.equal(fs.existsSync('data/career/index.yaml'), false);
  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(manifest.scripts['export:pdf'], undefined);
  const ci = fs.readFileSync('.github/workflows/ci.yaml', 'utf8');
  assert.doesNotMatch(ci, /output\/pdf|career-documents|export:pdf/);
  const tags = fs.readFileSync('plugins/global-tags/index.cjs', 'utf8');
  assert.doesNotMatch(tags, /loadCareer|resumeEntries|data\/career|about\/cv/);
});

test('About authored pages own bilingual copy and expose one ordinary-link section nav', () => {
  const nav = fs.readFileSync('src/components/AboutSectionNav/index.tsx', 'utf8');
  assert.match(nav, /aria-current/);
  assert.doesNotMatch(nav, /role="tab|onClick|useState/);
  for (const root of ['src/pages', 'i18n/en/docusaurus-plugin-content-pages']) {
    for (const page of ['about.mdx', 'about/portfolio.mdx', 'about/resume.mdx', 'about/cv.mdx', 'about/selected-cv.mdx']) {
      const text = fs.readFileSync(path.join(root, page), 'utf8');
      assert.ok(yaml.load(text.split('---')[1]).title);
      assert.equal(text.match(/<AboutSectionNav /g)?.length, 1);
      assert.doesNotMatch(text, /src\/generated|CareerDocumentTools|ResumeSummary|window\.location|<form/);
    }
    const gateway = fs.readFileSync(path.join(root, 'about/resume.mdx'), 'utf8');
    assert.match(gateway, /https:\/\/www\.linkedin\.com\/in\/jyje/);
    assert.doesNotMatch(gateway, /mailto:|<input|<iframe/);
    assert.doesNotMatch(gateway, /이력서 접근 요청|Request resume access|자동 발급|issue documents automatically|문의 목적/);
    assert.equal(yaml.load(gateway.split('---')[1]).title, root === 'src/pages' ? '이력서' : 'Resume');
    const portfolio = fs.readFileSync(path.join(root, 'about/portfolio.mdx'), 'utf8');
    assert.equal(portfolio.match(/<section className="about-section about-case">/g)?.length, 3);
    assert.equal(portfolio.match(/<Link to="\/blog\//g)?.length, 3);
    assert.doesNotMatch(portfolio, /\*\*(?:문제|담당 영역|접근 방법|Problem|Responsibilities|Approach):/);
  }
});
