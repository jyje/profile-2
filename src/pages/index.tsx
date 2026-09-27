import {type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomeQuickLinks from '@site/src/components/HomeQuickLinks';
import styles from './index.module.css';

type Copy = {
  title: string;
  description: string;
  identity: string;
  name: string;
  nativeName: string;
  introduction: string;
  blog: string;
  wiki: string;
  labs: string;
  about: string;
};

const COPY: Record<string, Copy> = {
  ko: {
    title: 'Jeayoung Jeon (전제영) | AI 플랫폼 엔지니어',
    description: 'AI와 클라우드에 대한 지식과 경험을 기록합니다.',
    identity: 'AI 플랫폼 엔지니어',
    name: 'Jeayoung Jeon',
    nativeName: '(전제영)',
    introduction: 'AI와 클라우드에 대한 지식과 경험을 기록합니다.',
    blog: '블로그',
    wiki: '위키',
    labs: '실험실',
    about: '소개',
  },
  en: {
    title: 'Jeayoung Jeon (전제영) | AI Platform Engineer',
    description: 'Notes on my knowledge and experience in AI and cloud.',
    identity: 'AI Platform Engineer',
    name: 'Jeayoung Jeon',
    nativeName: '(전제영)',
    introduction: 'I document my knowledge and experience in AI and cloud.',
    blog: 'Blog',
    wiki: 'Wiki',
    labs: 'Labs',
    about: 'About',
  },
};

export default function Home(): ReactNode {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const locale = currentLocale === 'ko' ? 'ko' : 'en';
  const copy = COPY[locale];

  return (
    <Layout title={copy.title} description={copy.description}>
      <main className={`container ${styles.home}`}>
        <section className={styles.hero} aria-labelledby="home-title">
          <p className={styles.identity}>{copy.identity}</p>
          <h1 className={styles.name} id="home-title">
            <span>{copy.name}</span>
            <span className={styles.nativeName}>{copy.nativeName}</span>
          </h1>
          <p className={styles.introduction}>{copy.introduction}</p>
          <HomeQuickLinks
            ariaLabel={locale === 'ko' ? '사이트 메뉴' : 'Site navigation'}
            items={[
              {to: '/blog', label: copy.blog},
              {to: '/wiki', label: copy.wiki},
              {to: '/labs', label: copy.labs},
              {to: '/about', label: copy.about},
            ]}
          />
        </section>
      </main>
    </Layout>
  );
}
