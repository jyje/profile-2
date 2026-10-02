import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import curation from '@site/src/generated/curation.json';
import {pickForDay, seoulDate, type CuratedItem} from '@site/src/utils/daily-curation';
import HomeQuickLinks from '@site/src/components/HomeQuickLinks';
import {IconArticle, IconBooks, IconBriefcase, IconFileCv, IconFlask, IconTrophy, IconUserCircle} from '@tabler/icons-react';
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
  recommendationsIntro: string;
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
    recommendationsIntro: '블로그 글 두 편과 위키 문서 두 편을 매일 골라 보여드립니다.',
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
    recommendationsIntro: 'Two blog posts and two wiki notes selected each day.',
    blog: 'Blog',
    wiki: 'Wiki',
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
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setDay(seoulDate());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const pools = CATALOG.recommendations[locale];
  const blogPicks = day ? pickForDay(pools.blog, CATALOG.counts.blog, day, 'blog') : [];
  const wikiPicks = day ? pickForDay(pools.wiki, CATALOG.counts.wiki, day, 'wiki') : [];
  const recommendations = day
    ? pickForDay([...blogPicks, ...wikiPicks], blogPicks.length + wikiPicks.length, day, 'recommendations')
    : [];

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
                <p className={styles.kicker}>01 / Discover · KST</p>
                <h2 id="home-recommendations">{copy.recommendations}</h2>
                <p>{copy.recommendationsIntro}</p>
              </div>
              <time className={styles.recommendationDate} dateTime={day ?? undefined}>
                {day ? formatDate(day, locale) : '···'}
              </time>
            </div>
            <ul className={styles.recommendationList}>
              {recommendations.map((item) => (
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
