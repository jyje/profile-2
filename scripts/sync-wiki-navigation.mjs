import fs from 'node:fs';
import path from 'node:path';

// Docusaurus builds sidebar structure from the default locale, then applies its
// standard current.json translations. Localized category files alone are not enough.
export function syncWikiNavigation(root) {
  const ko = path.join(root, '.content-build/ko/wiki');
  const en = path.join(root, '.content-build/en/wiki');
  const translations = {};
  if (fs.existsSync(ko)) for (const file of fs.readdirSync(ko, {recursive: true})) {
    if (path.basename(file) !== '_category_.json' || !fs.existsSync(path.join(en, file))) continue;
    const original = JSON.parse(fs.readFileSync(path.join(ko, file), 'utf8'));
    const translated = JSON.parse(fs.readFileSync(path.join(en, file), 'utf8'));
    translations[`sidebar.wikiSidebar.category.${original.key ?? original.label}`] = {message: translated.label};
  }
  const output = path.join(root, 'i18n/en/docusaurus-plugin-content-docs/current.json');
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(translations, null, 2));
}
