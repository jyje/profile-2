import OriginalPage from '@theme-original/Blog/Pages/BlogAuthorsPostsPage';
import type {Props} from '@theme/Blog/Pages/BlogAuthorsPostsPage';
import {BreadcrumbContext, useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';
import {useBlogMetadata} from '@docusaurus/plugin-content-blog/client';

export default function AuthorPage(props: Props) {
  const labels = useBreadcrumbLabels();
  const {blogBasePath, authorsListPath} = useBlogMetadata();
  return <BreadcrumbContext.Provider value={[
    {label: labels.blog, href: blogBasePath}, {label: labels.authors, href: authorsListPath}, {label: props.author.name ?? props.author.key},
  ]}><OriginalPage {...props} /></BreadcrumbContext.Provider>;
}
