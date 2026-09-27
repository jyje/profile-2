import OriginalPage from '@theme-original/DocTagDocListPage';
import type {Props} from '@theme/DocTagDocListPage';
import TagArchiveBreadcrumbs from '@site/src/components/SiteBreadcrumbs/TagArchive';

export default function DocTagDocListPage(props: Props) {
  return <><TagArchiveBreadcrumbs label={props.tag.label} /><OriginalPage {...props} /></>;
}
