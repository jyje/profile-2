import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import curation from '@site/src/generated/curation.json';
import {pickForDay, seoulDate, type CuratedItem} from '@site/src/utils/daily-curation';
import HomeQuickLinks from '@site/src/components/HomeQuickLinks';
import {
  IconArticle,
  IconBooks,
  IconBriefcase,
  IconFileCv,
  IconTrophy,
  IconUserCircle,
} from '@tabler/icons-react';
import styles from './index.module.css';

type Catalog = {
  featured: Record<string, CuratedItem[]>;
  reading: Record<string, CuratedItem[]>;
  daily: Record<string, {blog: CuratedItem[]; wiki: CuratedItem[]}>;
  counts: {blog: number; wiki: number};
};

type Copy = {
  title: string;
  description: string;
  identity: string;
  headline: string;
  introduction: string;
  about: string;
  resume: string;
  experience: string;
  achievements: string;
  featured: string;
  featuredIntro: string;
  readPost: string;
  reading: string;
  readingIntro: string;
  wiki: string;
  wikiIntro: string;
  openWiki: string;
  daily: string;
  dailyIntro: string;
  blog: string;
  allBlog: string;
  allWiki: string;
  korean: string;
};

const CATALOG = curation as Catalog;
const COPY: Record<string, Copy> = {
  ko: {
    title: 'Jeayoung Jeon (전제영) | AI 플랫폼 엔지니어',
    description: 'AI 플랫폼 엔지니어 전제영의 프로젝트, 포스트, 위키를 모았습니다.',
    identity: 'AI 플랫폼 엔지니어',
    headline: 'Jeayoung Jeon (전제영)',
    introduction: 'AI와 클러스터를 중심으로 연구와 제품 개발을 이어온 소프트웨어 엔지니어입니다. 문제해결을 위한 적정기술과 추진력, AI 네이티브 개발을 위한 기술 탐구에 관심이 많습니다.',
    about: '소개',
    resume: '이력서',
    experience: '경험',
    achievements: '성취',
    featured: '먼저 읽을 글',
    featuredIntro: '실제로 만들고 운영한 시스템을 중심으로 고른 이야기입니다.',
    readPost: '글 읽기',
    reading: '이어 읽기',
    readingIntro: '프로젝트, 전환점, 회고를 따라 읽어보세요.',
    wiki: '위키',
    wikiIntro: '블로그가 경험의 기록이라면, 위키는 작업 중 다시 찾는 문서입니다.',
    openWiki: '문서 보기',
    daily: '오늘의 발견',
    dailyIntro: '한국 시간을 기준으로 매일 달라지는 포스트와 위키 문서입니다.',
    blog: '블로그',
    allBlog: '모든 포스트',
    allWiki: '위키 둘러보기',
    korean: '한국어 원문',
  },
  en: {
    title: 'Jeayoung Jeon (전제영) | AI Platform Engineer',
    description: 'Projects, posts, and a wiki by Jeayoung Jeon, an AI platform engineer.',
    identity: 'AI Platform Engineer',
    headline: 'Jeayoung Jeon (전제영)',
    introduction: 'I am a software engineer whose work connects research and product development across AI and clusters. I care about practical technology and the drive to solve problems, and I explore the technologies behind AI-native development.',
    about: 'About',
    resume: 'Resume',
    experience: 'Experience',
    achievements: 'Achievements',
    featured: 'Start with a story',
    featuredIntro: 'A closer look at a system I built and operated.',
    readPost: 'Read the post',
    reading: 'Keep reading',
    readingIntro: 'Projects, turning points, and a year in review.',
    wiki: 'Wiki',
    wikiIntro: 'The blog records experience. The wiki holds notes I keep revising and returning to.',
    openWiki: 'Read the note',
    daily: 'Today’s finds',
    dailyIntro: 'Posts and wiki notes that change each day in Korea Standard Time.',
    blog: 'Blog',
    allBlog: 'All posts',
    allWiki: 'Explore the wiki',
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
              <span className={styles.arrow} aria-hidden="true">↗</span>
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

  const featuredBlog = CATALOG.featured[locale].find((item) => item.kind === 'blog');
  const featuredWiki = CATALOG.featured[locale].find((item) => item.kind === 'wiki');
  const daily = CATALOG.daily[locale];
  const blogPicks = day ? pickForDay(daily.blog, CATALOG.counts.blog, day, 'blog') : [];
  const wikiPicks = day ? pickForDay(daily.wiki, CATALOG.counts.wiki, day, 'wiki') : [];

  return (
    <Layout title={copy.title} description={copy.description}>
      <header className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div>
            <p className={styles.kicker}>{copy.identity}</p>
            <h1>{copy.headline}</h1>
            <p className={styles.introduction}>{copy.introduction}</p>
            <HomeQuickLinks
              ariaLabel={locale === 'ko' ? '빠른 탐색' : 'Quick navigation'}
              items={[
                {to: '/blog', label: copy.blog, icon: <IconArticle size={22} stroke={1.75} />, emphasis: true},
                {to: '/tags/careers', label: copy.experience, icon: <IconBriefcase size={22} stroke={1.75} />},
                {to: '/tags/achievements', label: copy.achievements, icon: <IconTrophy size={22} stroke={1.75} />, groupEnd: true},
                {to: '/wiki', label: copy.wiki, icon: <IconBooks size={22} stroke={1.75} />, emphasis: true, groupEnd: true},
                {to: '/about', label: copy.about, icon: <IconUserCircle size={22} stroke={1.75} />, emphasis: true},
                {to: '/about/resume', label: copy.resume, icon: <IconFileCv size={22} stroke={1.75} />},
              ]}
            />
          </div>
        </div>
      </header>

      <main className={`container ${styles.main}`}>
        {featuredBlog && (
          <section className={styles.featured} aria-labelledby="home-featured">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>01 / Featured</p>
                <h2 id="home-featured">{copy.featured}</h2>
                <p>{copy.featuredIntro}</p>
              </div>
              <Link to="/blog" className={styles.sectionLink}>{copy.allBlog} <span aria-hidden="true">↗</span></Link>
            </div>
            <a className={styles.featuredStory} href={rootBase + featuredBlog.url.slice(1)}>
              <div className={styles.featuredText}>
                <ItemMeta item={featuredBlog} locale={locale} label={copy.blog} />
                <h3>{featuredBlog.title}</h3>
                <p>{featuredBlog.description}</p>
                <span className={styles.storyAction}>{copy.readPost} <span aria-hidden="true">↗</span></span>
              </div>
              <div className={styles.featuredPattern} aria-hidden="true">
                <span>AI</span><span>ML</span><span>OPS</span>
              </div>
            </a>
          </section>
        )}

        <section className={styles.reading} aria-labelledby="home-reading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>02 / Editorial</p>
              <h2 id="home-reading">{copy.reading}</h2>
              <p>{copy.readingIntro}</p>
            </div>
          </div>
          <ol className={styles.readingList}>
            {CATALOG.reading[locale].map((item, index) => (
              <li key={item.id}>
                <a href={rootBase + item.url.slice(1)}>
                  <span className={styles.readingNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.readingBody}>
                    <ItemMeta item={item} locale={locale} label={copy.blog} />
                    <strong>{item.title}</strong>
                    <span className={styles.readingDescription}>{item.description}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ol>
          <Link to="/blog" className={styles.bottomLink}>{copy.allBlog} <span aria-hidden="true">↗</span></Link>
        </section>

        {featuredWiki && (
          <section className={styles.wikiFeature} aria-labelledby="home-wiki">
            <div>
              <p className={styles.kicker}>03 / Wiki</p>
              <h2 id="home-wiki">{copy.wiki}</h2>
              <p>{copy.wikiIntro}</p>
              <Link to="/wiki" className={styles.sectionLink}>{copy.allWiki} <span aria-hidden="true">↗</span></Link>
            </div>
            <a href={rootBase + featuredWiki.url.slice(1)} className={styles.wikiStory}>
              <ItemMeta item={featuredWiki} locale={locale} label={copy.wiki} />
              <strong>{featuredWiki.title}</strong>
              <span>{featuredWiki.description}</span>
              <span className={styles.storyAction}>{copy.openWiki} <span aria-hidden="true">↗</span></span>
            </a>
          </section>
        )}

        <section className={styles.daily} aria-labelledby="home-daily">
          <div className={styles.dailyHeading}>
            <p className={styles.kicker}>04 / Daily · KST</p>
            <h2 id="home-daily">{copy.daily}</h2>
            <p>{copy.dailyIntro}</p>
            <strong>{day ? formatDate(day, locale) : '···'}</strong>
          </div>
          <div className={styles.dailyContent}>
            {day && (
              <>
                <DailyList items={blogPicks} locale={locale} label={copy.blog} rootBase={rootBase} />
                <DailyList items={wikiPicks} locale={locale} label={copy.wiki} rootBase={rootBase} />
              </>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
