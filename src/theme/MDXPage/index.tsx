import OriginalPage from '@theme-original/MDXPage';
import type {Props} from '@theme/MDXPage';
import {BreadcrumbPlacementContext} from '@site/src/components/BreadcrumbFrame';
import type {BreadcrumbItem} from '@site/src/components/SiteBreadcrumbs';

export default function MDXPage(props: Props) {
  // The localized MDX front matter owns labels and public destinations.
  const items = props.content.metadata.frontMatter.breadcrumbs as BreadcrumbItem[] | undefined;
  return <BreadcrumbPlacementContext.Provider value={items ? {items} : null}>
    <OriginalPage {...props} />
  </BreadcrumbPlacementContext.Provider>;
}
