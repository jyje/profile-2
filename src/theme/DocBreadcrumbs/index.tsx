import {createContext, useContext} from 'react';
import OriginalBreadcrumbs from '@theme-original/DocBreadcrumbs';

export const BreadcrumbAlreadyPlaced = createContext(false);
export default function DocBreadcrumbs() {
  return useContext(BreadcrumbAlreadyPlaced) ? null : <OriginalBreadcrumbs />;
}
