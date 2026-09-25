import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import styles from './styles.module.css';

type TagItem = {
  kind: 'blog' | 'wiki' | 'portfolio' | 'resume';
  title: string;
  description: string;
  date: string;
  route: string;
  koreanFallback?: boolean;
};

type Tag = {
  slug: string;
  label: string;
  description: string;
  count: number;
  items: TagItem[];
};

type TagData = {
  locale: string;
  title: string;
  tagList: Tag[];
};

const TYPE_LABELS: Record<string, Record<TagItem['kind'], string>> = {
  ko: {blog: '블로그', wiki: '위키', portfolio: '포트폴리오', resume: '이력서'},
  en: {blog: 'Blog', wiki: 'Wiki', portfolio: 'Portfolio', resume: 'Resume'},
};

function TagIndex({data}: {data: TagData}): ReactNode {
  const isKorean = data.locale === 'ko';
  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.heading}>
        <h1>{isKorean ? '전체 태그' : 'All tags'}</h1>
        <p>{isKorean ? '블로그, 위키, 이력서, 포트폴리오의 주제를 한곳에서 찾아보세요.' : 'Explore topics across blog posts, wiki pages, the résumé, and portfolio.'}</p>
      </header>
      <div className={styles.tagGrid}>
        {data.tagList.map((tag) => (
          <Link className={styles.tagCard} key={tag.slug} to={`/tags/${tag.slug}`}>
            <span className={styles.tagLabel}>{tag.label}</span>
            <span className={styles.tagCount}>{tag.count}</span>
            {tag.description && <span className={styles.tagDescription}>{tag.description}</span>}
          </Link>
        ))}
      </div>
    </main>
  );
}

function TagDetail({data, tag}: {data: TagData; tag: Tag}): ReactNode {
  const isKorean = data.locale === 'ko';
  const typeLabels = TYPE_LABELS[data.locale] ?? TYPE_LABELS.en;
  return (
    <main className={`container ${styles.page}`}>
      <nav className={styles.breadcrumb} aria-label={isKorean ? '경로' : 'Breadcrumb'}>
        <Link to="/tags">{isKorean ? '전체 태그' : 'All tags'}</Link>
      </nav>
      <header className={styles.heading}>
        <h1>{tag.label}</h1>
        <p>{tag.description || (isKorean ? `${tag.count}개 항목` : `${tag.count} items`)}</p>
      </header>
      <ol className={styles.itemList}>
        {tag.items.map((item) => (
          <li className={styles.item} key={`${item.kind}:${item.route}:${item.title}`}>
            <div className={styles.itemMeta}>
              <span className={styles.type}>{typeLabels[item.kind]}</span>
              {item.koreanFallback && <span>{isKorean ? '한국어 원문' : 'Korean source'}</span>}
              {item.date && <time dateTime={item.date}>{item.date}</time>}
            </div>
            <h2><Link to={item.route}>{item.title}</Link></h2>
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ol>
      {tag.items.length === 0 && <p>{isKorean ? '아직 연결된 항목이 없습니다.' : 'No content is connected to this tag yet.'}</p>}
    </main>
  );
}

export default function GlobalTags({data, slug}: {data: TagData; slug: string | null}): ReactNode {
  const tag = slug ? data.tagList.find((item) => item.slug === slug) : undefined;
  const title = tag?.label ?? (data.locale === 'ko' ? '전체 태그' : 'All tags');
  return (
    <Layout title={title}>
      {tag ? <TagDetail data={data} tag={tag} /> : <TagIndex data={data} />}
    </Layout>
  );
}
