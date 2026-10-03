import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import curation from '@site/src/generated/curation.json';
import {localDate, pickForDay, type CuratedItem} from '@site/src/utils/daily-curation';
import HomeQuickLinks from '@site/src/components/HomeQuickLinks';
import {IconArticle, IconBooks, IconBriefcase, IconFileCv, IconFlask, IconRefresh, IconTrophy, IconUserCircle} from '@tabler/icons-react';
import styles from './index.module.css';

type Catalog = {
  recommendations: Record<string, {blog: CuratedItem[]; wiki: CuratedItem[]}>;
  counts: {dailyRandom: number; latestBlog: number; latestUpdated: number};
};

type Recommendation = {
  item: CuratedItem;
  role: 'daily-random' | 'recent-blog' | 'recent-update' | 'random-selection';
};

type Copy = {
  description: string;
  identity: string;
  authorName: string;
  introduction: string;
  resume: string;
  experience: string;
  achievements: string;
  labs: string;
  about: string;
  recommendations: string;
  randomRecommendationsIntro: string;
  recommendationsFallback: string;
  refreshRecommendations: string;
  refreshTooltip: string;
  blog: string;
  wiki: string;
  korean: string;
};

const CATALOG = curation as Catalog;
const COPY: Record<string, Copy> = {
  ko: {
    description: 'AI와 클라우드에 대한 지식과 경험을 기록합니다.',
    identity: 'AI 플랫폼 엔지니어',
    authorName: '전제영',
    resume: '이력서',
    experience: '경험',
    achievements: '성취',
    introduction: 'AI 플랫폼과 클라우드 시스템을 만들고 운영한 경험, 다시 참고할 지식, 진행 중인 실험을 기록합니다.',
    labs: '실험실',
    about: '소개',
    recommendations: '오늘의 추천',
    randomRecommendationsIntro: '그 밖의 추천글입니다.',
    recommendationsFallback: '오늘 주목할 만한 글입니다.',
    refreshRecommendations: '새로고침',
    refreshTooltip: 'Fisher-Yates 셔플: 새로고침할 때 오늘 날짜와 횟수를 시드로 글 네 편을 무작위 선택합니다.',
    blog: '블로그',
    wiki: '위키',
    korean: '한국어 원문',
  },
  en: {
    description: 'Notes on my knowledge and experience in AI and cloud.',
    identity: 'AI Platform Engineer',
    authorName: 'Jeayoung Jeon',
    resume: 'Resume',
    experience: 'Careers',
    achievements: 'Achievements',
    introduction: 'A record of building and operating AI platform and cloud systems, reusable knowledge, and ongoing experiments.',
    labs: 'Labs',
    about: 'About',
    recommendations: "Today's recommendations",
    randomRecommendationsIntro: 'Other recommendations.',
    recommendationsFallback: 'Noteworthy reads for today.',
    refreshRecommendations: 'Refresh',
    refreshTooltip: 'Fisher-Yates shuffle: each refresh uses today’s date and refresh count to choose four random reads.',
    blog: 'Blog',
    wiki: 'Wiki',
    korean: 'Korean original',
  },
};

function formatDate(day: string, locale: string): string {
  const date = new Date(day.includes('T') ? day : day + 'T12:00:00');
  return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatRecommendationsIntro(day: string, locale: string): string {
  const date = new Date(day + 'T12:00:00');
  if (locale === 'ko') {
    const weekday = new Intl.DateTimeFormat('ko-KR', {weekday: 'long'}).format(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${dayOfMonth} ${weekday}, 오늘 주목할 만한 글입니다.`;
  }
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
  return `Noteworthy reads for ${dateLabel}.`;
}

function latestRecommendations(pools: Catalog['recommendations'][string], counts: Catalog['counts']): Recommendation[] {
  const recentBlogs = [...pools.blog]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, counts.latestBlog);
  const seen = new Set(recentBlogs.map((item) => item.url));
  const recentUpdates = [...pools.blog, ...pools.wiki]
    .filter((item) => item.lastUpdatedAt && !seen.has(item.url))
    .sort((a, b) => (b.lastUpdatedAt ?? '').localeCompare(a.lastUpdatedAt ?? ''));
  const selected: Recommendation[] = recentBlogs.map((item) => ({item, role: 'recent-blog'}));
  for (const item of recentUpdates) {
    if (selected.filter(({role}) => role === 'recent-update').length >= counts.latestUpdated) break;
    if (seen.has(item.url)) continue;
    selected.push({item, role: 'recent-update'});
    seen.add(item.url);
  }
  return selected;
}

function recommendationsForDay(
  pools: Catalog['recommendations'][string],
  counts: Catalog['counts'],
  day: string | null,
  refreshCount: number,
  previousUrls: string[] = [],
): Recommendation[] {
  if (day && refreshCount > 0) {
    const allItems = [...pools.blog, ...pools.wiki];
    const previous = new Set(previousUrls);
    const withoutPrevious = allItems.filter((item) => !previous.has(item.url));
    const candidates = withoutPrevious.length >= counts.dailyRandom + counts.latestBlog + counts.latestUpdated
      ? withoutPrevious
      : allItems;
    return pickForDay(
      candidates,
      counts.dailyRandom + counts.latestBlog + counts.latestUpdated,
      day,
      `recommendation-refresh-${refreshCount}`,
    ).map((item) => ({item, role: 'random-selection'}));
  }

  const latest = latestRecommendations(pools, counts);
  if (!day) return latest;
  const excluded = new Set(latest.map(({item}) => item.url));
  const candidates = [...pools.blog, ...pools.wiki].filter((item) => !excluded.has(item.url));
  const randomItem = pickForDay(candidates, counts.dailyRandom, day, `recommendation-${refreshCount}`)
    .map((item) => ({item, role: 'daily-random' as const}));
  return [...randomItem, ...latest];
}

function ItemMeta({item, locale, label, role}: {item: CuratedItem; locale: string; label: string; role: Recommendation['role']}) {
  const showUpdated = role === 'recent-update' || item.kind === 'wiki';
  return (
    <span className={styles.itemMeta}>
      <span>{label}</span>
      {showUpdated && item.lastUpdatedAt && (
        <span>
          {formatDate(item.lastUpdatedAt, locale)} {locale === 'ko' ? '수정됨' : 'Updated'}
        </span>
      )}
      {!showUpdated && item.date && <span>{formatDate(item.date, locale)}</span>}
      {locale === 'en' && item.sourceLocale === 'ko' && <span>{COPY.en.korean}</span>}
    </span>
  );
}

export default function Home(): ReactNode {
  const {
    i18n: {currentLocale, defaultLocale},
    siteConfig: {baseUrl},
  } = useDocusaurusContext();
  const locale = currentLocale in CATALOG.recommendations ? currentLocale : 'en';
  const copy = COPY[locale] ?? COPY.en;
  const localeSuffix = currentLocale === defaultLocale ? '' : currentLocale + '/';
  const rootBase = localeSuffix && baseUrl.endsWith(localeSuffix)
    ? baseUrl.slice(0, -localeSuffix.length)
    : baseUrl;
  const pools = CATALOG.recommendations[locale];
  const [today, setToday] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => latestRecommendations(pools, CATALOG.counts));
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    let currentDay = localDate();
    setToday(currentDay);
    setRefreshCount(0);
    setHasRefreshed(false);
    setRecommendations(recommendationsForDay(pools, CATALOG.counts, currentDay, 0));
    const timer = window.setInterval(() => {
      const nextDay = localDate();
      if (nextDay !== currentDay) {
        currentDay = nextDay;
        setToday(nextDay);
        setRefreshCount(0);
        setHasRefreshed(false);
        setRecommendations(recommendationsForDay(pools, CATALOG.counts, nextDay, 0));
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [pools]);

  const refreshRecommendations = () => {
    const nextDay = localDate();
    const nextCount = nextDay === today ? refreshCount + 1 : 1;
    const previousUrls = recommendations.map(({item}) => item.url);
    setToday(nextDay);
    setRefreshCount(nextCount);
    setRecommendations(recommendationsForDay(pools, CATALOG.counts, nextDay, nextCount, previousUrls));
    setHasRefreshed(true);
  };

  return (
    <Layout description={copy.description}>
      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={`container ${styles.heroInner}`}>
            <h1 className={styles.siteTitle} id="home-title">jyje.online</h1>
            <p className={styles.introduction}>{copy.introduction}</p>
            <p className={styles.author} id="home-author">
              {'- '}
              {locale === 'ko' ? (
                <><span>{copy.identity}</span>{' '}<Link to="/about" rel="author"><strong>{copy.authorName}</strong></Link></>
              ) : (
                <><Link to="/about" rel="author"><strong>{copy.authorName}</strong></Link>{', '}<span>{copy.identity}</span></>
              )}
            </p>
            <HomeQuickLinks
              ariaLabel={locale === 'ko' ? '사이트 메뉴' : 'Site navigation'}
              items={[
                {to: '/about', label: copy.about, icon: <IconUserCircle size={22} stroke={1.75} />, emphasis: true},
                {to: '/about/resume', label: copy.resume, icon: <IconFileCv size={22} stroke={1.75} />, groupEnd: true},
                {to: '/blog', label: copy.blog, icon: <IconArticle size={22} stroke={1.75} />, emphasis: true},
                {to: '/tags/careers', label: copy.experience, icon: <IconBriefcase size={22} stroke={1.75} />},
                {to: '/tags/achievements', label: copy.achievements, icon: <IconTrophy size={22} stroke={1.75} />, groupEnd: true},
                {to: '/wiki', label: copy.wiki, icon: <IconBooks size={22} stroke={1.75} />, emphasis: true, groupEnd: true},
                {to: '/labs', label: copy.labs, icon: <IconFlask size={22} stroke={1.75} />, emphasis: true},
              ]}
            />
          </div>
        </section>

        <div className={`container ${styles.main}`}>
          <section className={styles.recommendations} aria-labelledby="home-recommendations">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>01 / Discover</p>
                <h2 id="home-recommendations">{copy.recommendations}</h2>
                <p>{hasRefreshed
                  ? copy.randomRecommendationsIntro
                  : today ? formatRecommendationsIntro(today, locale) : copy.recommendationsFallback}</p>
              </div>
              <button
                className={styles.refreshButton}
                type="button"
                onClick={refreshRecommendations}
                aria-label={copy.refreshRecommendations}
                title={copy.refreshTooltip}
              >
                <IconRefresh size={18} stroke={1.8} aria-hidden="true" />
                <span>{copy.refreshRecommendations}</span>
              </button>
            </div>
            <ul className={styles.recommendationList} aria-live="polite">
              {recommendations.map(({item, role}) => (
                <li key={item.id}>
                  <a href={rootBase + item.url.slice(1)}>
                    <span className={styles.recommendationBody}>
                      <ItemMeta item={item} locale={locale} role={role} label={item.kind === 'blog' ? copy.blog : copy.wiki} />
                      <strong className={styles.recommendationTitle}>{item.title}</strong>
                      {item.description && <span className={styles.recommendationDescription}>{item.description}</span>}
                    </span>
                    <span className={styles.arrow} aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </Layout>
  );
}
