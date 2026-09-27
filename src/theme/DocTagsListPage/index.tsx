import OriginalPage from '@theme-original/DocTagsListPage';
import type {Props} from '@theme/DocTagsListPage';
import TagArchiveBreadcrumbs from '@site/src/components/SiteBreadcrumbs/TagArchive';

export default function DocTagsListPage(props: Props) {
  return <><TagArchiveBreadcrumbs /><OriginalPage {...props} /></>;
}
