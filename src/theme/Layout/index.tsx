import OriginalLayout from '@theme-original/Layout';
import type {Props} from '@theme/Layout';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import SiteBreadcrumbs, {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';
import styles from '@site/src/components/SiteBreadcrumbs/styles.module.css';
import ScrollReveal from '@site/src/components/ScrollReveal';

// These original pages have no insertion slot inside their content component.
// Wrap the layout's children only; keep their state, routing and markup upstream.
export default function Layout(props: Props) {
  const labels = useBreadcrumbLabels();
  const {pathname} = useLocation();
  const base = useBaseUrl('/');
  const relative = pathname.startsWith(base) ? pathname.slice(base.length).replace(/\/$/, '') : '';
  const items = relative === 'search' ? [{label: labels.search}]
    : relative === 'blog/archive' ? [{label: labels.blog, href: '/blog/'}, {label: labels.archive}]
      : relative === 'about' ? [{label: labels.about}]
        : relative === 'about/resume' ? [{label: labels.about, href: '/about/'}, {label: labels.resume}] : null;
  return <OriginalLayout {...props}>
    <ScrollReveal pathname={pathname} />
    {items && <div className={`container ${styles.standalone}`}><SiteBreadcrumbs items={items} /></div>}
    {props.children}
  </OriginalLayout>;
}
