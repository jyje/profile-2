import * as yaml from 'js-yaml';
import {normalizeUrl} from '@docusaurus/utils';
import {parseBlogFileName} from '@docusaurus/plugin-content-blog/lib/blogUtils.js';

// Verification-only adapter to the installed blog plugin's filename parser.
// Never infer a post's URL from its excluded source directory.
export function blogPublicationRoute(markdown, stagedRelativeFile, baseUrl) {
  const header = markdown.match(/^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---/);
  const frontMatter = header ? yaml.load(header[1]) ?? {} : {};
  if (frontMatter.draft) return undefined;
  const slug = frontMatter.slug ?? parseBlogFileName(stagedRelativeFile).slug;
  return normalizeUrl([baseUrl, 'blog', slug]);
}
