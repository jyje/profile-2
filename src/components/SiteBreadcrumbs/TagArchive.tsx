import SiteBreadcrumbs, {useBreadcrumbLabels} from './index';
import BreadcrumbFrame from '../BreadcrumbFrame';

export default function TagArchiveBreadcrumbs({label}: {label?: string}) {
  const labels = useBreadcrumbLabels();
  return <BreadcrumbFrame>
    <SiteBreadcrumbs items={[{label: labels.tags, href: '/tags/'}, ...(label ? [{label}] : [])]} />
  </BreadcrumbFrame>;
}
