import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import curation from '@site/src/generated/curation.json';
import {pickForDay, seoulDate, type CuratedItem} from '@site/src/utils/daily-curation';
import styles from './index.module.css';

type Catalog = {
  featured: Record<string, CuratedItem[]>;
  daily: Record<string, {blog: CuratedItem[]; wiki: CuratedItem[]}>;
  counts: {blog: number; wiki: number};
};

type Copy = {
  title: string;
  eyebrow: string;
  headline: string;
  introduction: string;
  about: string;
  featuredTitle: string;
  featuredIntro: string;
  dailyTitle: string;
  dailyIntro: string;
  blog: string;
  wiki: string;
  allBlog: string;
  allWiki: string;
  loading: string;
  korean: string;
};

const CATALOG = curation as Catalog;
const COPY: Record<string, Copy> = {
  ko: {
    title: '기록의 시작',
    eyebrow: 'AI 플랫폼 엔지니어 전제영의 기록',
    headline: '기술을 만들고, 기록합니다.',
    introduction: '프로젝트에서 얻은 경험은 블로그에, 계속 다듬는 지식은 위키에 담았습니다. 오늘 읽을 글과 직접 고른 글에서 시작해 보세요.',
    about: '소개 보기',
    featuredTitle: '먼저 읽어보세요',
    featuredIntro: '프로젝트와 경험을 보여주는 글을 직접 골랐습니다.',
    dailyTitle: '오늘의 발견',
    dailyIntro: '서울 날짜를 기준으로 매일 달라지는 블로그와 위키 글입니다.',
    blog: '블로그',
    wiki: '위키',
    allBlog: '블로그 전체',
    allWiki: '위키 전체',
    loading: '오늘의 글을 고르는 중입니다.',
    korean: '한국어 원문',
  },
  en: {
    title: 'Start reading',
    eyebrow: 'Notes from Jeayoung Jeon, AI platform engineer',
    headline: 'Build the work. Keep the notes.',
    introduction: 'The blog holds project stories and experience. The wiki holds knowledge I continue to revise. Start with today’s selection or the pieces I chose to highlight.',
    about: 'About me',
    featuredTitle: 'Start here',
    featuredIntro: 'A few selected pieces about projects and practice.',
    dailyTitle: 'Today’s finds',
    dailyIntro: 'A different set of blog posts and wiki notes each day in Seoul.',
    blog: 'Blog',
    wiki: 'Wiki',
    allBlog: 'All blog posts',
    allWiki: 'All wiki notes',
    loading: 'Choosing today’s reading.',
    korean: 'Korean original',
  },
};

function formatDate(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(day + 'T12:00:00+09:00'));
}

function ItemMeta({item, locale, label}: {item: CuratedItem; locale: string; label: string}) {
  return (
    <span className={styles.itemMeta}>
      <span>{label}</span>
      {item.date && <span>{formatDate(item.date, locale)}</span>}
      {locale === 'en' && item.sourceLocale === 'ko' && <span>{COPY.en.korean}</span>}
    </span>
  );
}

function FeaturedCard({item, locale, rootBase}: {item: CuratedItem; locale: string; rootBase: string}) {
  const copy = COPY[locale] ?? COPY.en;
  return (
    <a className={styles.featuredCard} href={rootBase + item.url.slice(1)}>
      <ItemMeta item={item} locale={locale} label={item.kind === 'blog' ? copy.blog : copy.wiki} />
      <span className={styles.featuredCardTitle}>{item.title}</span>
      {item.description && <span className={styles.featuredDescription}>{item.description}</span>}
      <span className={styles.cardArrow} aria-hidden="true">↗</span>
    </a>
  );
}

function DailyList({items, locale, label, rootBase}: {items: CuratedItem[]; locale: string; label: string; rootBase: string}) {
  return (
    <div className={styles.dailyGroup}>
      <h3>{label}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={rootBase + item.url.slice(1)}>
              <span className={styles.dailyTitle}>{item.title}</span>
              <ItemMeta item={item} locale={locale} label={label} />
              <span className={styles.dailyArrow} aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home(): ReactNode {
  const {
    i18n: {currentLocale, defaultLocale},
    siteConfig: {baseUrl},
  } = useDocusaurusContext();
  const locale = currentLocale in CATALOG.featured ? currentLocale : 'en';
  const copy = COPY[locale] ?? COPY.en;
  const localeSuffix = currentLocale === defaultLocale ? '' : currentLocale + '/';
  const rootBase = localeSuffix && baseUrl.endsWith(localeSuffix)
    ? baseUrl.slice(0, -localeSuffix.length)
    : baseUrl;
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setDay(seoulDate());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const daily = CATALOG.daily[locale];
  const blogPicks = day ? pickForDay(daily.blog, CATALOG.counts.blog, day, 'blog') : [];
  const wikiPicks = day ? pickForDay(daily.wiki, CATALOG.counts.wiki, day, 'wiki') : [];

  return (
    <Layout title={copy.title} description={copy.introduction}>
      <header className={styles.hero}>
        <div className="container">
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1>{copy.headline}</h1>
            <p className={styles.introduction}>{copy.introduction}</p>
            <Link to="/about" className={styles.aboutLink}>{copy.about} <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>
      <main className={`container ${styles.main}`}>
        <section className={styles.featured}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Selected</p>
              <h2>{copy.featuredTitle}</h2>
              <p>{copy.featuredIntro}</p>
            </div>
          </div>
          <div className={styles.featuredGrid}>
            {CATALOG.featured[locale].map((item) => <FeaturedCard key={item.kind + item.id} item={item} locale={locale} rootBase={rootBase} />)}
          </div>
        </section>
        <section className={styles.daily}>
          <div className={styles.dateRail}>
            <p className={styles.kicker}>Daily / Seoul</p>
            <h2>{copy.dailyTitle}</h2>
            <p>{copy.dailyIntro}</p>
            <strong className={styles.today}>{day ? formatDate(day, locale) : '···'}</strong>
          </div>
          <div className={styles.dailyContent} aria-live="polite">
            {day ? (
              <>
                <DailyList items={blogPicks} locale={locale} label={copy.blog} rootBase={rootBase} />
                <DailyList items={wikiPicks} locale={locale} label={copy.wiki} rootBase={rootBase} />
              </>
            ) : <p className={styles.loading}>{copy.loading}</p>}
            <div className={styles.moreLinks}>
              <Link to="/blog">{copy.allBlog} <span aria-hidden="true">↗</span></Link>
              <Link to="/wiki">{copy.allWiki} <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
