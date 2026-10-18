import {createContext, type ReactNode} from 'react';
import clsx from 'clsx';
import SiteBreadcrumbs, {type BreadcrumbItem} from '../SiteBreadcrumbs';
import styles from './styles.module.css';
import ScrollTrail from './ScrollTrail';

export type BreadcrumbPlacement = {items: BreadcrumbItem[]; blogSidebar?: boolean};
export const BreadcrumbPlacementContext = createContext<BreadcrumbPlacement | null>(null);

// A page's reading width and hero spacing must never position its navigation.
// Wiki passes the original theme breadcrumb here, without reimplementing it.
export default function BreadcrumbFrame({items, blogSidebar, children}: Partial<BreadcrumbPlacement> & {children?: ReactNode}) {
  return <div data-breadcrumb-frame className={clsx(styles.frame, blogSidebar && styles.blogSidebar)}>
    <ScrollTrail>{children ?? (items && <SiteBreadcrumbs items={items} />)}</ScrollTrail>
  </div>;
}
