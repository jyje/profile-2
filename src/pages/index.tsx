import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import curation from '@site/src/generated/curation.json';
import {pickRandom, localDate, type CuratedItem} from '@site/src/utils/daily-curation';
import HomeQuickLinks from '@site/src/components/HomeQuickLinks';
import {IconArticle, IconBooks, IconBriefcase, IconFileCv, IconFlask, IconRefresh, IconTrophy, IconUserCircle} from '@tabler/icons-react';
import styles from './index.module.css';

type Catalog = {
  recommendations: Record<string, {blog: CuratedItem[]; wiki: CuratedItem[]}>;
  counts: {blog: number; wiki: number};
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
  refreshRecommendations: string;
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
    recommendations: '오늘의 발견',
    refreshRecommendations: '새로고침',
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
    recommendations: 'Today’s finds',
    refreshRecommendations: 'Refresh',
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

function ItemMeta({item, locale, label}: {item: CuratedItem; locale: string; label: string}) {
  return (
    <span className={styles.itemMeta}>
      <span>{label}</span>
      {item.kind === 'blog' && item.date && <span>{formatDate(item.date, locale)}</span>}
      {item.kind === 'wiki' && item.lastUpdatedAt && (
        <span>
          {locale === 'ko' ? '마지막 편집' : 'Last edited'} {formatDate(item.lastUpdatedAt, locale)}
        </span>
      )}
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
  const [recommendations, setRecommendations] = useState<CuratedItem[] | null>(null);

  useEffect(() => {
    const choose = (previous: CuratedItem[] = []) => {
      const pools = CATALOG.recommendations[locale];
      const blogPicks = pickRandom(
        pools.blog,
        CATALOG.counts.blog,
        previous.filter((item) => item.kind === 'blog').map((item) => item.id),
      );
      const wikiPicks = pickRandom(
        pools.wiki,
        CATALOG.counts.wiki,
        previous.filter((item) => item.kind === 'wiki').map((item) => item.id),
      );
      return pickRandom([...blogPicks, ...wikiPicks], blogPicks.length + wikiPicks.length);
    };

    setRecommendations(choose());
    let currentDay = localDate();
    const timer = window.setInterval(() => {
      const nextDay = localDate();
      if (nextDay !== currentDay) {
        currentDay = nextDay;
        setRecommendations((previous) => choose(previous ?? []));
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [locale]);

  const refreshRecommendations = () => {
    const previous = recommendations ?? [];
    const pools = CATALOG.recommendations[locale];
    const blogPicks = pickRandom(
      pools.blog,
      CATALOG.counts.blog,
      previous.filter((item) => item.kind === 'blog').map((item) => item.id),
    );
    const wikiPicks = pickRandom(
      pools.wiki,
      CATALOG.counts.wiki,
      previous.filter((item) => item.kind === 'wiki').map((item) => item.id),
    );
    setRecommendations(pickRandom([...blogPicks, ...wikiPicks], blogPicks.length + wikiPicks.length));
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
                <p>{locale === 'ko' ? '무작위 추천 글 입니다' : 'Randomly selected recommendations.'}</p>
              </div>
              <button
                className={styles.refreshButton}
                type="button"
                onClick={refreshRecommendations}
                aria-label={copy.refreshRecommendations}
              >
                <IconRefresh size={18} stroke={1.8} aria-hidden="true" />
                <span>{copy.refreshRecommendations}</span>
              </button>
            </div>
            <ul className={styles.recommendationList} aria-live="polite">
              {(recommendations ?? []).map((item) => (
                <li key={item.id}>
                  <a href={rootBase + item.url.slice(1)}>
                    <span className={styles.recommendationBody}>
                      <ItemMeta item={item} locale={locale} label={item.kind === 'blog' ? copy.blog : copy.wiki} />
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
