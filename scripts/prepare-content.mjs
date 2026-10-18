import fs from 'node:fs';
import path from 'node:path';
import {contentMode, ignorePatterns, isDocIgnored, publicationContext} from '../plugins/content-visibility.cjs';
import {createLastUpdateReader, withLastUpdate} from './content-last-update.mjs';
import {withDevelopmentNotice} from './development-notice.mjs';
import {planLocaleFallbacks, withLocaleFallback, writeFallbackManifest} from './locale-fallback.mjs';

// Stage authored content without mutating it. Underscored development sections get
// their old public-shaped paths only in the local development build.
export function prepareContent(root, mode = contentMode()) {
  const patterns = ignorePatterns(root);
  const readDate = createLastUpdateReader(root);
  const fallbacks = planLocaleFallbacks(root);
  const borrowed = new Map();
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
          const authored = path.join(from, entry.name);
          const fallback = fallbacks.get(authored);
          // A borrowed body keeps its own extension so .md stays CommonMark and .mdx stays MDX.
          const name = fallback ? entry.name.replace(/\.mdx?$/, path.extname(fallback.file)) : entry.name;
          const destination = path.join(to, development ? name.slice(1) : name);
          if (fs.existsSync(destination)) throw new Error(`Development content alias collision: ${relative}`);
          if (entry.isDirectory()) copy(authored, destination);
          else if (/\.mdx?$/.test(entry.name)) {
            const text = fs.readFileSync(authored, 'utf8');
            // Borrowed bodies show the date of the file whose text is displayed.
            const markdown = fallback
              ? withLastUpdate(withLocaleFallback(text, authored, fallback, locale), fallback.file, readDate)
              : withLastUpdate(text, authored, readDate);
            if (fallback) borrowed.set(`content/${path.relative(output, destination).replaceAll('\\', '/')}`, fallback.locale);
            fs.writeFileSync(destination, mode === 'development' && ignored ? withDevelopmentNotice(markdown, locale) : markdown);
          } else fs.copyFileSync(path.join(from, entry.name), destination);
        }
      }
      copy(source, target, true);
    }
  }
  fs.mkdirSync(output, {recursive: true});
  writeFallbackManifest(output, borrowed);
  fs.writeFileSync(path.join(output, 'publication-context.json'), JSON.stringify(publicationContext(root, mode)));
}
