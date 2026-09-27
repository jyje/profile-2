import OriginalHomeItem from '@theme-original/DocBreadcrumbs/Items/Home';
import {useLocation} from '@docusaurus/router';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';

export default function WikiHomeItem() {
  const {pathname} = useLocation();
  const home = useBaseUrl('/wiki/');
  const labels = useBreadcrumbLabels();
  return <><OriginalHomeItem />{pathname.replace(/\/$/, '') !== home.replace(/\/$/, '') &&
    <li className="breadcrumbs__item"><Link className="breadcrumbs__link" href={home}>{labels.wiki}</Link></li>}</>;
}
