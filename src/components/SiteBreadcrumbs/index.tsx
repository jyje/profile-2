import {createContext, type ReactNode} from 'react';
import clsx from 'clsx';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HomeItem from '@theme-original/DocBreadcrumbs/Items/Home';
import styles from './styles.module.css';

export type BreadcrumbItem = {label: string; href?: string; onNavigate?: () => void};
export const BreadcrumbContext = createContext<BreadcrumbItem[] | null>(null);

export function useBreadcrumbLabels() {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  return currentLocale === 'ko'
    ? {home: '홈', nav: '탐색 경로', blog: '블로그', wiki: '🏠 위키 홈', about: '소개', labs: '실험실', tags: '전체 태그', authors: '작성자', archive: '아카이브', search: '검색'}
    : {home: 'Home', nav: 'Breadcrumbs', blog: 'Blog', wiki: '🏠 Wiki Home', about: 'About', labs: 'Labs', tags: 'All tags', authors: 'Authors', archive: 'Archive', search: 'Search'};
}

export default function SiteBreadcrumbs({items, className}: {items: BreadcrumbItem[]; className?: string}): ReactNode {
  const labels = useBreadcrumbLabels();
  const home = useBaseUrl('/');
  const {withBaseUrl} = useBaseUrlUtils();
  const {siteConfig} = useDocusaurusContext();
  const {pathname} = useLocation();
  if (!items.length) return null;
  // Remote-only screen IDs are not public URLs and must not become SEO routes.
  const publicItems = items.filter(item => !item.onNavigate);
  const structured = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    {label: labels.home, href: home}, ...publicItems,
  ].map((item, index) => ({'@type': 'ListItem', position: index + 1, name: item.label,
    item: new URL(item.href ? withBaseUrl(item.href) : pathname, siteConfig.url).href}))};
  return <>
    <Head><script type="application/ld+json">{JSON.stringify(structured).replace(/</g, '\\u003c')}</script></Head>
    <nav className={clsx('site-breadcrumbs', styles.breadcrumbs, className)} aria-label={labels.nav}>
      <ul className="breadcrumbs">
        <HomeItem />
        {items.map((item, index) => {
          const active = index === items.length - 1;
          return <li key={index} className={clsx('breadcrumbs__item', active && 'breadcrumbs__item--active')}>
            {active ? <span className="breadcrumbs__link" aria-current="page">{item.label}</span>
              : item.onNavigate ? <button type="button" className="breadcrumbs__link" onClick={item.onNavigate}>{item.label}</button>
              : item.href ? <Link className="breadcrumbs__link" to={item.href}>{item.label}</Link>
              : <span className="breadcrumbs__link">{item.label}</span>}
          </li>;
        })}
      </ul>
    </nav>
  </>;
}
