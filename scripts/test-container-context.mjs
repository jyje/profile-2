import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {load} from 'js-yaml';
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
  assert.match(await read('.github/workflows/publish-github-pages.yaml'), /if: github.ref == 'refs\/heads\/main'/);
  assert.match(await read('.github/workflows/ci.yaml'), /branches:\s+- main\s+- dev/);
  const docker = await read('Dockerfile');
  const runtime = docker.slice(docker.lastIndexOf('FROM nginx:'));
  assert.match(runtime, /USER 101:101/);
  assert.match(runtime, /COPY --from=build \/site\/build\//);
  assert.doesNotMatch(runtime, /npm|COPY \. /);
});

test('development publishing checks privacy on both sides of upload and retains only digest metadata', async () => {
  const workflow = load(await fs.readFile(new URL('../.github/workflows/publish-development-image.yaml', import.meta.url), 'utf8'));
  const steps = workflow.jobs.image.steps;
  const publish = steps.find(step => step.run?.includes('docker push'));
  const publishBoundary = publish.run.split('docker buildx imagetools inspect')[0];
  for (const [before, after, status, pushes] of [
    ['private', 'private', 0, 1], ['public', 'private', 1, 0],
    ['missing', 'private', 1, 0], ['private', 'public', 1, 1],
  ]) {
    const script = `
      gh() {
        value="$BEFORE"
        if [ -f "$RUNNER_TEMP/pushed" ]; then value="$AFTER"; fi
        [ "$value" != missing ] || return 1
        printf '%s\\n' "$value"
      }
      docker() { : > "$RUNNER_TEMP/pushed"; printf 'PUSHED\\n'; }
      ${publishBoundary}
    `;
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'container-publish-'));
    try {
      const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
        encoding: 'utf8', env: {...process.env, BEFORE: before, AFTER: after, RUNNER_TEMP: temp},
      });
      assert.equal(result.status, status, `${before} -> ${after}: ${result.stderr}`);
      assert.equal(result.stdout.match(/^PUSHED$/gm)?.length ?? 0, pushes, `${before} -> ${after}`);
    } finally {await fs.rm(temp, {recursive: true, force: true});}
  }
  const ux = steps.find(step => step.name === 'Verify runtime UX');
  assert.match(ux.run, /npm run lint:ux > "\$RUNNER_TEMP\/development-ux\.log" 2>&1/);
  assert.deepEqual(steps.filter(step => step.uses?.startsWith('actions/upload-artifact@')).map(step => step.with.path), ['image-reference.json']);
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

test('title-only documents inherit the body date while explicit target overrides remain authoritative', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'container-borrowed-date-'));
  try {
    await fs.mkdir(path.join(root, 'design-system'));
    for (const file of ['content-contract.json', 'format-v1.json']) await fs.copyFile(new URL(`../design-system/${file}`, import.meta.url), path.join(root, 'design-system', file));
    const file = 'content/en/wiki/d/note.md'; const source = path.join(root, file);
    await fs.mkdir(path.dirname(source), {recursive: true});
    const bodyFile = path.join(root, 'content/ko/wiki/d/note.md');
    const fallbacks = new Map([[source, {file: bodyFile, data: {}}]]);
    await fs.writeFile(source, '---\ntitle: 📄 Note\n---\n');
    const readDate = value => value === bodyFile ? '2024-02-01T00:00:00Z' : '2026-03-01T00:00:00Z';
    const run = async name => {
      const destination = path.join(root, name);
      await prepareContainerContext({root, destination, files: [file], revision: 'a'.repeat(40), readDate, fallbacks});
      return fs.readFile(path.join(destination, file), 'utf8');
    };
    assert.match(await run('body-git'), /2024-02-01/);
    fallbacks.get(source).data.last_update = {date: '2023-01-01'};
    assert.match(await run('body-override'), /2023-01-01/);
    await fs.writeFile(source, '---\ntitle: 📄 Note\nlast_update:\n  date: "2025-04-01"\n---\n');
    assert.match(await run('target-override'), /2025-04-01/);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});
