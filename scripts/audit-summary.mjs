import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const levels = new Set(['info', 'low', 'moderate', 'high', 'critical']);
const issues = {undici: 66, joi: 68, minimatch: 69, deepmerge: 70, 'body-parser': 71, qs: 72, 'serialize-javascript': 73, braces: 65};
const namePattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;
const versionPattern = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
const advisoryPattern = /^https:\/\/github\.com\/advisories\/(GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4})$/;

// No scanner prose, URLs other than canonical advisories, paths or environment
// values cross this boundary. Fail without echoing malformed diagnostic values.
export function summarizeAudit(audit, lock) {
  const invalid = () => { throw new Error('Audit summary rejected invalid or uncovered input'); };
  if (!audit || !lock?.packages || Array.isArray(lock.packages) || !audit.vulnerabilities || typeof audit.vulnerabilities !== 'object' || Array.isArray(audit.vulnerabilities)) invalid();
  const nodes = audit.vulnerabilities;
  const versions = name => [...new Set(Object.entries(lock.packages)
    .filter(([key]) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`))
    .map(([, value]) => value.version))].sort();
  for (const [name, value] of Object.entries(nodes)) {
    if (!namePattern.test(name) || !levels.has(value?.severity) || !Array.isArray(value.via)) invalid();
    const resolved = versions(name);
    if (!resolved.length || resolved.some(version => !versionPattern.test(version))) invalid();
    for (const via of value.via) {
      if (typeof via === 'string') { if (!Object.hasOwn(nodes, via)) invalid(); }
      else if (!via || !advisoryPattern.test(via.url) || !levels.has(via.severity)) invalid();
    }
  }
  const rootNames = Object.keys(nodes).filter(name => nodes[name].via.some(via => typeof via !== 'string')).sort();
  const roots = rootNames.map(name => ({package: name, versions: versions(name), severity: nodes[name].severity,
    advisories: [...new Set(nodes[name].via.filter(via => typeof via !== 'string').map(via => via.url))].sort(),
    issue: Object.hasOwn(issues, name) ? `https://github.com/jyje/profile-2/issues/${issues[name]}` : null,
    status: Object.hasOwn(issues, name) ? 'tracked-unresolved' : 'untracked-unresolved'}));
  const counts = Object.fromEntries([...levels].map(level => [level, 0]));
  const packages = Object.keys(nodes).sort().map(name => {
    const found = new Set(); const seen = new Set();
    const visit = current => {
      if (seen.has(current)) return;
      seen.add(current);
      if (rootNames.includes(current)) found.add(current);
      for (const via of nodes[current].via) if (typeof via === 'string') visit(via);
    };
    visit(name);
    if (!found.size) invalid();
    counts[nodes[name].severity]++;
    return {package: name, versions: versions(name), severity: nodes[name].severity, roots: [...found].sort()};
  });
  return {schemaVersion: 1, counts, rootCount: roots.length, packageCount: packages.length, roots, packages,
    exposure: 'Scanner severity is not runtime reachability. Static hosting and build/development exposure require separate review. Local mitigations do not resolve upstream findings.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = spawnSync('npm', ['audit', '--package-lock-only', '--ignore-scripts', '--json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
    if (![0, 1].includes(result.status)) throw new Error();
    const report = summarizeAudit(JSON.parse(result.stdout), JSON.parse(readFileSync('package-lock.json')));
    console.log(JSON.stringify(report, null, 2));
    if (report.roots.some(root => !root.issue)) process.exitCode = 1;
  } catch {
    console.error('Sanitized audit reporting failed. Review diagnostics privately; no raw output was published.');
    process.exitCode = 1;
  }
}
