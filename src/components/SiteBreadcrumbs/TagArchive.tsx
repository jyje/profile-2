import SiteBreadcrumbs, {useBreadcrumbLabels} from './index';

export default function TagArchiveBreadcrumbs({label}: {label?: string}) {
  const labels = useBreadcrumbLabels();
  return <div className="container margin-top--lg"><div className="row"><div className="col col--8 col--offset-2">
    <SiteBreadcrumbs items={[{label: labels.tags, href: '/tags/'}, ...(label ? [{label}] : [])]} />
  </div></div></div>;
}
