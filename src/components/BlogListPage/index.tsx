import React, {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import type {Props} from '@theme/BlogListPage';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import BlogPostItems from '@theme/BlogPostItems';
import BlogPostItemHeader from '@theme/BlogPostItem/Header';
import BlogPostItemContent from '@theme/BlogPostItem/Content';
import BlogPostItemFooter from '@theme/BlogPostItem/Footer';
import SearchMetadata from '@theme/SearchMetadata';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import styles from './styles.module.css';

type ViewMode = 'list' | 'grid';

const viewModeStorageKey = 'profile-2.blog-view-mode';

function isViewMode(value: string | null): value is ViewMode {
  return value === 'list' || value === 'grid';
}

function BlogListPageMetadata({metadata}: Props): ReactNode {
  const {
    siteConfig: {title: siteTitle},
  } = useDocusaurusContext();
  const {blogDescription, blogTitle, permalink} = metadata;
  const title = permalink === '/' ? siteTitle : blogTitle;

  return (
    <>
      <PageMetadata title={title} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function GridBlogPostItem({children}: {children: ReactNode}): ReactNode {
  const {assets, frontMatter} = useBlogPost();
  const frontMatterImage = frontMatter.image;
  const externalImage =
    typeof frontMatterImage === 'string' &&
    (/^(https?:)?\/\//i.test(frontMatterImage) || frontMatterImage.startsWith('/'))
      ? frontMatterImage
      : undefined;
  const image = assets.image ?? externalImage;

  return (
    <article className={styles.card}>
      {image && (
        <div className={styles.cardImage} aria-hidden="true">
          <img src={image} alt="" loading="lazy" />
        </div>
      )}
      <div className={styles.cardBody}>
        <BlogPostItemHeader />
        <BlogPostItemContent>{children}</BlogPostItemContent>
        <BlogPostItemFooter />
      </div>
    </article>
  );
}

function ViewModeIcon({mode}: {mode: ViewMode}): ReactNode {
  if (mode === 'list') {
    return (
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
        <path
          d="M7.5 5h9M7.5 10h9M7.5 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function BlogListPage(props: Props): ReactNode {
  const {metadata, items, sidebar} = props;
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const isKorean = currentLocale === 'ko';
  const labels = isKorean
    ? {group: '보기 방식', list: '목록', grid: '카드'}
    : {group: 'View style', list: 'List', grid: 'Grid'};
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(viewModeStorageKey);
      if (isViewMode(savedMode)) {
        setViewMode(savedMode);
      }
    } catch {
      // Keep the list view when browser storage is unavailable.
    }
  }, []);

  function selectViewMode(mode: ViewMode) {
    setViewMode(mode);
    try {
      window.localStorage.setItem(viewModeStorageKey, mode);
    } catch {
      // The current selection still works for this page when storage is blocked.
    }
  }

  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <BlogLayout sidebar={sidebar}>
        <div className={styles.controls}>
          <div className={styles.toggle} role="group" aria-label={labels.group}>
            <button
              className={styles.toggleButton}
              type="button"
              aria-pressed={viewMode === 'list'}
              onClick={() => selectViewMode('list')}>
              <ViewModeIcon mode="list" />
              <span>{labels.list}</span>
            </button>
            <button
              className={styles.toggleButton}
              type="button"
              aria-pressed={viewMode === 'grid'}
              onClick={() => selectViewMode('grid')}>
              <ViewModeIcon mode="grid" />
              <span>{labels.grid}</span>
            </button>
          </div>
        </div>
        <div className={viewMode === 'grid' ? styles.grid : undefined}>
          {viewMode === 'grid' ? (
            <BlogPostItems items={items} component={GridBlogPostItem} />
          ) : (
            <BlogPostItems items={items} />
          )}
        </div>
        <BlogListPaginator metadata={metadata} />
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}
