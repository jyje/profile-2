import fs from 'node:fs';
import path from 'node:path';
import {contentMode, ignorePatterns, isDocIgnored, publicationContext} from '../plugins/content-visibility.cjs';

// Stage authored content without mutating it. Underscored development sections get
// their old public-shaped paths only in the local development build.
export function prepareContent(root, mode = contentMode()) {
  const patterns = ignorePatterns(root);
  const output = path.join(root, '.content-build');
  fs.rmSync(output, {recursive: true, force: true});
  for (const locale of ['ko', 'en']) {
    for (const kind of ['wiki', 'blog']) {
      const source = path.join(root, 'content', locale, kind);
      const target = path.join(output, locale, kind);
      function copy(from, to, top = false) {
        if (!fs.existsSync(from)) return;
        fs.mkdirSync(to, {recursive: true});
        for (const entry of fs.readdirSync(from, {withFileTypes: true})) {
          if (entry.isSymbolicLink()) throw new Error(`Content symlinks are not supported: ${from}/${entry.name}`);
          const relative = path.relative(root, path.join(from, entry.name)).replaceAll('\\', '/') + (entry.isDirectory() ? '/' : '');
          const ignored = isDocIgnored(relative, patterns);
          if (entry.name.startsWith('.') || (ignored && mode === 'public')) continue;
          const development = top && entry.isDirectory() && ignored && entry.name.startsWith('_');
          const destination = path.join(to, development ? entry.name.slice(1) : entry.name);
          if (fs.existsSync(destination)) throw new Error(`Development content alias collision: ${relative}`);
          if (entry.isDirectory()) copy(path.join(from, entry.name), destination);
          else fs.copyFileSync(path.join(from, entry.name), destination);
        }
      }
      copy(source, target, true);
    }
  }
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'publication-context.json'), JSON.stringify(publicationContext(root, mode)));
}
