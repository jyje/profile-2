import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {prepareContainerContext} from './container-context.mjs';

test('container publication is restricted to trusted dev and Pages remains main-only', async () => {
  const read = file => fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const workflow = await read('.github/workflows/publish-development-image.yaml');
  assert.match(workflow, /branches: \[dev\]/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/dev'/);
  assert.doesNotMatch(workflow, /pull_request(?:_target)?:/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /REQUIRE_CLEAN_REVISION: 'true'/);
  assert.match(workflow, /--cap-drop ALL --security-opt no-new-privileges/);
  assert.match(workflow, /\.visibility\)" = private/);
  assert.match(await read('.github/workflows/publish-github-pages.yaml'), /if: github.ref == 'refs\/heads\/main'/);
  assert.match(await read('.github/workflows/ci.yaml'), /branches:\s+- main\s+- dev/);
  const docker = await read('Dockerfile');
  const runtime = docker.slice(docker.lastIndexOf('FROM nginx:'));
  assert.match(runtime, /USER 101:101/);
  assert.match(runtime, /COPY --from=build \/site\/build\//);
  assert.doesNotMatch(runtime, /npm|COPY \. /);
});

test('container context preserves authored dates without copying Git, credentials or private files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'container-source-'));
  const destination = path.join(root, 'out');
  const files = ['content/ko/wiki/d/note.md', 'package.json', 'hidden/private.md', 'data/career/private.yml', '.git/config', '.env', 'src/generated/career.json'];
  try {
    await fs.mkdir(path.join(root, 'design-system'));
    for (const file of ['content-contract.json', 'format-v1.json']) {
      await fs.copyFile(new URL(`../design-system/${file}`, import.meta.url), path.join(root, 'design-system', file));
    }
    for (const file of files) {
      await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
      await fs.writeFile(path.join(root, file), file.endsWith('note.md') ? '---\ntitle: 📄 Test\n---\nPublic body\n' : 'SYNTHETIC_PRIVATE_MARKER');
    }
    await fs.writeFile(path.join(root, 'package.json'), '{}');
    const count = await prepareContainerContext({root, destination, files, revision: 'a'.repeat(40), readDate: () => '2025-01-02T00:00:00Z'});
    assert.equal(count, 2);
    const content = await fs.readFile(path.join(destination, 'content/ko/wiki/d/note.md'), 'utf8');
    assert.match(content, /2025-01-02/);
    assert.match(content, /Public body/);
    assert.doesNotMatch(await fs.readFile(path.join(root, 'content/ko/wiki/d/note.md'), 'utf8'), /last_update/);
    for (const file of files.slice(2)) await assert.rejects(fs.access(path.join(destination, file)));
    await assert.rejects(prepareContainerContext({root, destination, files, revision: 'a'.repeat(40), readDate: () => undefined}), /must be empty/);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});
