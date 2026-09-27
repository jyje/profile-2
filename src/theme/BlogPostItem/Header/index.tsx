import OriginalHeader from '@theme-original/BlogPostItem/Header';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import SiteBreadcrumbs, {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function BlogHeader() {
  const {metadata, isBlogPostPage} = useBlogPost();
  const blogBasePath = useBaseUrl('/blog/');
  const labels = useBreadcrumbLabels();
  return <>{isBlogPostPage && <SiteBreadcrumbs items={[
    {label: labels.blog, href: blogBasePath}, {label: metadata.title},
  ]} />}<OriginalHeader /></>;
}
