import {useContext} from 'react';
import OriginalLayout from '@theme-original/BlogLayout';
import type {Props} from '@theme/BlogLayout';
import SiteBreadcrumbs, {BreadcrumbContext, useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function BlogLayout(props: Props) {
  const provided = useContext(BreadcrumbContext);
  const labels = useBreadcrumbLabels();
  const base = useBaseUrl('/blog/');
  const {pathname} = useLocation();
  const relative = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/$/, '') : null;
  const blog = {label: labels.blog, href: base};
  const items = provided ?? (relative === '' || relative?.startsWith('page/') ? [blog]
    : relative === 'authors' ? [blog, {label: labels.authors}]
    : relative === '_tag-archives' ? [{label: labels.tags, href: '/tags/'}] : null);
  return <OriginalLayout {...props}>{items && <SiteBreadcrumbs items={items} />}{props.children}</OriginalLayout>;
}
