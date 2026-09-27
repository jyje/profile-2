import OriginalStructuredData from '@theme-original/DocBreadcrumbs/StructuredData';
import type {Props} from '@theme/DocBreadcrumbs/StructuredData';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function WikiBreadcrumbData(props: Props) {
  const {metadata} = useDoc();
  const home = useBaseUrl('/wiki/');
  const labels = useBreadcrumbLabels();
  const isHome = metadata.permalink.replace(/\/$/, '') === home.replace(/\/$/, '');
  return <OriginalStructuredData {...props} breadcrumbs={isHome ? props.breadcrumbs : [
    {type: 'link', label: labels.wiki, href: home}, ...props.breadcrumbs,
  ]} />;
}
