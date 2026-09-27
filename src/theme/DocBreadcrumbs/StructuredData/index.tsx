import OriginalStructuredData from '@theme-original/DocBreadcrumbs/StructuredData';
import type {Props} from '@theme/DocBreadcrumbs/StructuredData';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function WikiBreadcrumbData(props: Props) {
  const {pathname} = useLocation();
  const home = useBaseUrl('/wiki/');
  const siteHome = useBaseUrl('/');
  const labels = useBreadcrumbLabels();
  const isHome = pathname.replace(/\/$/, '') === home.replace(/\/$/, '');
  return <OriginalStructuredData {...props} breadcrumbs={[
    {type: 'link', label: labels.home, href: siteHome},
    ...(isHome ? [] : [{type: 'link' as const, label: labels.wiki, href: home}]),
    ...props.breadcrumbs,
  ]} />;
}
