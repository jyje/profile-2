import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createLastUpdateReader, withLastUpdate} from './content-last-update.mjs';
import {formatContent} from './content-format/v1.mjs';

const allowed = /^(?:(?:src|scripts|plugins|content|data|static|i18n|design-system|docs|container|\.github\/workflows)\/|(?:package(?:-lock)?\.json|docusaurus\.config\.ts|sidebars\.ts|tsconfig\.json|components\.json|\.docignore|\.prettierrc\.cjs|\.prettierignore|Dockerfile|\.dockerignore|\.github\/dependabot\.yaml)$)/;
const blocked = /^(?:hidden\/|data\/career\/|src\/generated\/|\.git\/)|(?:^|\/)\.env(?:\.|$)/;
export async function prepareContainerContext({root, destination, files, readDate, revision, dirty = false}) {
  if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('A full source revision is required');
  await fs.mkdir(destination, {recursive: true});
  if ((await fs.readdir(destination)).length) throw new Error('Container destination must be empty');
  let count = 0;
  const sourceRoot = await fs.realpath(root);
  for (const file of files) {
    if (!allowed.test(file) || blocked.test(file)) continue;
    if (path.isAbsolute(file) || file.split('/').includes('..')) throw new Error('Unsafe container source path');
    const source = path.join(root, file);
    if (!(await fs.realpath(source)).startsWith(sourceRoot + path.sep)) throw new Error('Container source escapes repository');
    if (!(await fs.lstat(source)).isFile()) throw new Error('Container sources must be regular files');
    const target = path.join(destination, file);
    await fs.mkdir(path.dirname(target), {recursive: true});
    if (/^content\/(ko|en)\/(wiki|blog)\/.*\.mdx?$/.test(file)) {
      const stamped = withLastUpdate(await fs.readFile(source, 'utf8'), source, readDate);
      await fs.writeFile(target, await formatContent(stamped, file, {root}));
    } else await fs.copyFile(source, target);
    count++;
  }
  await fs.writeFile(path.join(destination, 'container-revision.json'), JSON.stringify({revision, dirty}) + '\n');
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = path.resolve(import.meta.dirname, '..');
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
  const files = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
  const dirty = Boolean(git(['status', '--porcelain', '--untracked-files=no']));
  if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('Commit tracked changes before preparing a publishable context; --allow-dirty is for local testing only');
  const destination = await fs.mkdtemp(path.join(os.tmpdir(), 'profile-container-context-'));
  try {
    const count = await prepareContainerContext({root, destination, files, revision: git(['rev-parse', 'HEAD']), readDate: createLastUpdateReader(root), dirty});
    console.log(JSON.stringify({destination, files: count}));
  } catch (error) {
    await fs.rm(destination, {recursive: true, force: true});
    throw error;
  }
}
