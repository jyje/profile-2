import {execFileSync} from 'node:child_process';
import path from 'node:path';
import * as yaml from 'js-yaml';

// Dates belong to authored files, never their generated copies or build time.
// Create one reader per sync so a long-running watcher sees new commits.
export function createLastUpdateReader(root) {
  const git = (...args) => execFileSync('git', ['--literal-pathspecs', ...args], {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  let available = false;
  try { available = git('rev-parse', '--is-inside-work-tree') === 'true'; } catch { /* Source archives have no Git dates. */ }
  if (available && git('rev-parse', '--is-shallow-repository') === 'true') {
    throw new Error('Accurate content update dates require full Git history. Use checkout fetch-depth: 0 or git fetch --unshallow.');
  }
  if (available) {
    try { git('rev-parse', '--verify', 'HEAD'); } catch { available = false; }
  }
  const dates = new Map();
  return source => {
    if (!available) return undefined;
    const relative = path.relative(root, source);
    if (!dates.has(relative)) {
      const timestamp = git('-c', 'log.showSignature=false', 'log', '-1', '--follow', '--format=%cI', '--', relative);
      dates.set(relative, timestamp || undefined);
    }
    return dates.get(relative);
  };
}

export function withLastUpdate(markdown, source, readDate) {
  const match = markdown.match(/^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  const metadata = match ? yaml.load(match[1]) ?? {} : {};
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`Invalid document front matter: ${source}`);
  }
  if (metadata.last_update != null && (typeof metadata.last_update !== 'object' || Array.isArray(metadata.last_update))) {
    throw new Error(`Invalid last_update front matter: ${source}`);
  }
  // Explicit author choices are left intact, including other last_update fields.
  if (metadata.last_update?.date != null) return markdown;
  const date = readDate(source);
  if (!date) return markdown; // No fabricated date for uncommitted/new documents.
  metadata.last_update = {...metadata.last_update, date};
  const body = match ? markdown.slice(match[0].length) : markdown;
  return `---\n${yaml.dump(metadata, {lineWidth: -1, noRefs: true})}---\n${body}`;
}
