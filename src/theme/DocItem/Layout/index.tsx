import OriginalLayout from '@theme-original/DocItem/Layout';
import OriginalBreadcrumbs from '@theme-original/DocBreadcrumbs';
import type {Props} from '@theme/DocItem/Layout';
import {BreadcrumbAlreadyPlaced} from '@site/src/theme/DocBreadcrumbs';
import BreadcrumbFrame from '@site/src/components/BreadcrumbFrame';
import styles from './styles.module.css';

export default function DocItemLayout(props: Props) {
  return <>
    <BreadcrumbFrame><OriginalBreadcrumbs /></BreadcrumbFrame>
    <div className={`container ${styles.reading}`}>
      <BreadcrumbAlreadyPlaced.Provider value={true}><OriginalLayout {...props} /></BreadcrumbAlreadyPlaced.Provider>
    </div>
  </>;
}
