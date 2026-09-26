import OriginalContent from '@theme-original/BlogPostItem/Content';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import type {Props} from '@theme/BlogPostItem/Content';
import ContentConnections from '@site/src/components/ContentConnections';

export default function BlogContent(props: Props) {
  const {metadata, isBlogPostPage} = useBlogPost();
  return <><OriginalContent {...props} />{isBlogPostPage && <ContentConnections permalink={metadata.permalink} />}</>;
}
