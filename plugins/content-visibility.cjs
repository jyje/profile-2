const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function contentMode(env = process.env) {
  const mode = env.SITE_CONTENT_MODE ?? 'public';
  if (!['public', 'development'].includes(mode)) {
    throw new Error(`Invalid SITE_CONTENT_MODE: ${mode}. Use public or development.`);
  }
  return mode;
}

function ignorePatterns(root = ROOT) {
  // Fail closed when the policy is absent or invalid, rather than publishing
  // content that was expected to be local-only.
  return fs.readFileSync(path.join(root, '.docignore'), 'utf8').split(/\r?\n/)
    .map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
      if (!line.startsWith('content/') || line.includes('\\') || line.split('/').includes('..') || line.includes('!')) {
        throw new Error(`Invalid .docignore rule: ${line}. Use root-relative content globs without negation.`);
      }
      return line.endsWith('/') ? `${line}**` : line;
    });
}

function isDocIgnored(relative, patterns = ignorePatterns()) {
  const normalized = relative.replaceAll('\\', '/').replace(/^\.\//, '');
  return patterns.some(pattern => path.matchesGlob(normalized, pattern));
}

function authorFile(source, root = ROOT) {
  const match = source.match(/^(content\/(?:ko|en)\/(?:wiki|blog)\/)([^/]+)(\/.*)$/);
  if (!match) return source;
  const candidate = `${match[1]}_${match[2]}${match[3]}`;
  return isDocIgnored(candidate, ignorePatterns(root)) ? candidate : source;
}

function publicationContext(root = ROOT, mode = contentMode()) {
  return {mode, patterns: ignorePatterns(root)};
}

function assertPreparedContent(root = ROOT) {
  const marker = path.join(root, '.content-build/publication-context.json');
  const expected = JSON.stringify(publicationContext(root));
  if (!fs.existsSync(marker) || fs.readFileSync(marker, 'utf8') !== expected) {
    throw new Error('Content mode or .docignore changed. Use npm run build for public output, or npm run dev for local documents.');
  }
}

module.exports = {contentMode, ignorePatterns, isDocIgnored, authorFile, publicationContext, assertPreparedContent};
