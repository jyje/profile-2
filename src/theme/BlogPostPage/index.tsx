import OriginalPage from '@theme-original/BlogPostPage';
import type {Props} from '@theme/BlogPostPage';
import {BreadcrumbContext, useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function BlogPostPage(props: Props) {
  const labels = useBreadcrumbLabels();
  return <BreadcrumbContext.Provider value={[
    {label: labels.blog, href: '/blog/'}, {label: props.content.metadata.title},
  ]}><OriginalPage {...props} /></BreadcrumbContext.Provider>;
}
