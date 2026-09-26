export function shouldRebuild(name, filename) {
  if (!filename) return false;
  const relative = String(filename).replaceAll('\\', '/');
  if (relative.split('/').some(segment => segment.startsWith('.'))) return false;
  if (name === 'src' && relative.startsWith('generated/')) return false;
  if (name === 'i18n' && /^en\/docusaurus-plugin-content-(blog|docs)(\/|$)/.test(relative)) return false;
  return true;
}
