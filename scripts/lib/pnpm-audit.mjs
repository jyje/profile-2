// Dependency-free adapters from pnpm inputs to the shapes summarizeAudit()
// consumes. Every function throws a generic error on unexpected input so the
// caller fails closed without echoing scanner or lockfile text.
const fail = () => { throw new Error('pnpm audit input rejected as invalid or unrecognized'); };
const ghsa = /^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/;
const entry = /^ {2}(?:'([^']+)'|([^\s'][^:]*)):(?: \{\})?\s*$/;

// Reads the registry-package keys (`name@version:`) of the project document,
// which is the last YAML document of pnpm-lock.yaml. Returns the
// `{packages: {path: {version}}}` shape that summarizeAudit() expects, with one
// entry per resolved version.
export function parsePnpmLock(text) {
  if (typeof text !== 'string') fail();
  const documents = text.split(/^---\s*$/m);
  const lines = documents[documents.length - 1].split('\n');
  const start = lines.findIndex(line => line === 'packages:');
  if (start < 0) fail();
  const packages = {};
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const match = entry.exec(line);
    if (!match) continue;
    const key = match[1] ?? match[2];
    const at = key.lastIndexOf('@');
    if (at <= 0) continue;
    const name = key.slice(0, at); const version = key.slice(at + 1);
    packages[`pnpm/${key}/node_modules/${name}`] = {version};
  }
  if (!Object.keys(packages).length) fail();
  return {packages};
}

// Converts `pnpm audit --json` (`{advisories: {id: {...}}, metadata}`) into the
// `{vulnerabilities: {name: {severity, via}}}` graph used by summarizeAudit().
// Advisory modules become roots; every ancestor on a finding path becomes a
// dependent node that points at the next package on the path.
export function normalizePnpmAudit(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) fail();
  if (!report.advisories || typeof report.advisories !== 'object' || Array.isArray(report.advisories)) fail();
  if (!report.metadata?.vulnerabilities || typeof report.metadata.vulnerabilities !== 'object') fail();
  const order = ['info', 'low', 'moderate', 'high', 'critical'];
  const vulnerabilities = {};
  const node = (name, severity) => {
    const current = vulnerabilities[name] ??= {severity, via: []};
    if (order.indexOf(severity) > order.indexOf(current.severity)) current.severity = severity;
    return current;
  };
  for (const advisory of Object.values(report.advisories)) {
    if (!advisory || typeof advisory !== 'object' || typeof advisory.module_name !== 'string' || typeof advisory.severity !== 'string') fail();
    const url = typeof advisory.github_advisory_id === 'string' && ghsa.test(advisory.github_advisory_id)
      ? `https://github.com/advisories/${advisory.github_advisory_id}` : advisory.url;
    node(advisory.module_name, advisory.severity).via.push({url, severity: advisory.severity});
    for (const finding of Array.isArray(advisory.findings) ? advisory.findings : []) {
      for (const path of Array.isArray(finding?.paths) ? finding.paths : []) {
        if (typeof path !== 'string') fail();
        const chain = path.split('>').map(part => part.replace(/(?<=.)@[^@/]*$/, '')).filter(part => part && part !== '.');
        const end = chain.lastIndexOf(advisory.module_name);
        if (end < 0) continue;
        for (let i = 0; i < end; i++) {
          const parent = node(chain[i], advisory.severity);
          if (!parent.via.includes(chain[i + 1])) parent.via.push(chain[i + 1]);
        }
      }
    }
  }
  return {vulnerabilities};
}
