import OriginalPage from '@theme-original/BlogTagsPostsPage';
import type {Props} from '@theme/BlogTagsPostsPage';
import {BreadcrumbContext, useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function TaggedPosts(props: Props) {
  const labels = useBreadcrumbLabels();
  return <BreadcrumbContext.Provider value={[
    {label: labels.tags, href: '/tags/'}, {label: props.tag.label},
  ]}><OriginalPage {...props} /></BreadcrumbContext.Provider>;
}
