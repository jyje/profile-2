import React, {useEffect, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  HtmlClassNameProvider,
  PageMetadata,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import type {Props} from '@theme/BlogListPage';
import BlogLayout from '@theme/BlogLayout';
import BlogPostItems from '@theme/BlogPostItems';
import SearchMetadata from '@theme/SearchMetadata';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import styles from './styles.module.css';

type ViewMode = 'list' | 'grid';

const viewModeStorageKey = 'profile-2.blog-view-mode';
const postsPerLoad = 10;

function isViewMode(value: string | null): value is ViewMode {
  return value === 'list' || value === 'grid';
}

function getPostSummary(description: string): string {
  return description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPostDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
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

function GridBlogPostItem(): ReactNode {
  const {metadata, frontMatter, assets} = useBlogPost();
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const frontMatterImage = frontMatter.image;
  const externalImage =
    typeof frontMatterImage === 'string' &&
    (/^(https?:)?\/\//i.test(frontMatterImage) || frontMatterImage.startsWith('/'))
      ? frontMatterImage
      : undefined;
  const image = assets.image ?? externalImage;
  const summary = getPostSummary(metadata.description);
  const date = formatPostDate(metadata.date, currentLocale);

  return (
    <article className={styles.card}>
      <Link className={styles.cardLink} to={metadata.permalink}>
        {image && (
          <div className={styles.cardImage} aria-hidden="true">
            <img src={image} alt="" loading="lazy" decoding="async" />
          </div>
        )}
        <div className={styles.cardBody}>
          <time className={styles.cardDate} dateTime={metadata.date}>{date}</time>
          <h3 className={styles.cardTitle}>{metadata.title}</h3>
          {summary && <p className={styles.cardSummary}>{summary}</p>}
        </div>
      </Link>
    </article>
  );
}

function ListBlogPostItem(): ReactNode {
  const {metadata} = useBlogPost();
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const summary = getPostSummary(metadata.description);
  const date = formatPostDate(metadata.date, currentLocale);

  return (
    <article className={styles.listItem}>
      <Link className={styles.listLink} to={metadata.permalink}>
        <time className={styles.listDate} dateTime={metadata.date}>{date}</time>
        <div className={styles.listContent}>
          <h3 className={styles.listTitle}>{metadata.title}</h3>
          {summary && <p className={styles.listSummary}>{summary}</p>}
        </div>
      </Link>
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
  const {items, sidebar} = props;
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const isKorean = currentLocale === 'ko';
  const labels = isKorean
    ? {group: '보기 방식', list: '목록', grid: '카드'}
    : {group: 'View style', list: 'List', grid: 'Grid'};
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [visiblePostCount, setVisiblePostCount] = useState(postsPerLoad);
  const visibleItems = items.slice(0, visiblePostCount);
  const hasMorePosts = visibleItems.length < items.length;
  const postsByYear = new Map<number, Array<(typeof items)[number]>>();

  for (const item of visibleItems) {
    const year = new Date(item.content.metadata.date).getUTCFullYear();
    const yearItems = postsByYear.get(year);
    if (yearItems) {
      yearItems.push(item);
    } else {
      postsByYear.set(year, [item]);
    }
  }

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
        {Array.from(postsByYear, ([year, yearItems]) => (
          <section
            className={styles.yearGroup}
            aria-labelledby={`blog-year-${year}`}
            key={year}>
            <h2 className={styles.yearHeading} id={`blog-year-${year}`}>
              {year}
            </h2>
            <div className={viewMode === 'grid' ? styles.grid : styles.list}>
              {viewMode === 'grid' ? (
                <BlogPostItems items={yearItems} component={GridBlogPostItem} />
              ) : (
                <BlogPostItems items={yearItems} component={ListBlogPostItem} />
              )}
            </div>
          </section>
        ))}
        {hasMorePosts && (
          <div className={styles.loadMore}>
            <button
              className={styles.loadMoreButton}
              type="button"
              onClick={() =>
                setVisiblePostCount((count) =>
                  Math.min(count + postsPerLoad, items.length),
                )
              }>
              {isKorean ? '더 불러오기' : 'Load more'}
            </button>
          </div>
        )}
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}
