import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './about.module.css';

type AboutCopy = {
  title: string;
  eyebrow: string;
  name: string;
  lead: string;
  intro: string[];
  focusTitle: string;
  focus: {label: string; description: string}[];
  pathTitle: string;
  path: {period: string; title: string; description: string}[];
  linksTitle: string;
  portfolio: string;
  portfolioDescription: string;
  resume: string;
  resumeDescription: string;
  contact: string;
};

const COPY: Record<string, AboutCopy> = {
  ko: {
    title: '소개',
    eyebrow: 'About / Jeayoung Jeon',
    name: '전제영',
    lead: '서울에서 활동하는 AI 플랫폼 엔지니어입니다.',
    intro: [
      '기술로 문제를 풀고, 팀과 함께 성장하는 것을 추구합니다. AI와 클러스터를 주력 도메인으로 연구와 제품 개발을 이어 왔습니다.',
      '현재 현대오토에버 개발환경플랫폼팀에서 AI 개발을 리드하고 있습니다. Agentic AI 애플리케이션과 이를 운영하는 플랫폼을 함께 설계합니다.',
    ],
    focusTitle: '제가 하는 일',
    focus: [
      {label: 'Agentic AI', description: '에이전트 앱과 도메인 도구를 제품으로 연결합니다.'},
      {label: 'AI 플랫폼', description: 'Kubernetes, GPU, LLMOps와 운영 자동화를 다룹니다.'},
      {label: '팀 리딩', description: '아키텍처와 협업 방식을 함께 설계합니다.'},
      {label: '기술지식', description: '컴퓨터 비전과 차량 기술 연구 경험을 의사 결정에 활용합니다.'},
    ],
    pathTitle: '이어진 경력',
    path: [
      {period: '2025 - 현재', title: '현대오토에버', description: 'AI 플랫폼 및 차량 소프트웨어 검증을 위한 Agentic AI 개발'},
      {period: '2021 - 2024', title: '맥스트', description: 'MLOps, 하이브리드 Kubernetes, 디지털 트윈 플랫폼'},
      {period: '2012 - 2020', title: 'POSTECH', description: '컴퓨터 비전, 자율주행, Visual SLAM 연구'},
    ],
    linksTitle: '경력 더 보기',
    portfolio: '포트폴리오',
    portfolioDescription: '프로젝트의 배경과 구현 과정을 자세히 기록했습니다.',
    resume: '이력서',
    resumeDescription: '경력과 역량을 간결하게 정리했습니다.',
    contact: 'LinkedIn에서 연락하기',
  },
  en: {
    title: 'About',
    eyebrow: 'About / Jeayoung Jeon',
    name: 'Jeayoung Jeon',
    lead: 'I am an AI platform engineer based in Seoul.',
    intro: [
      'I enjoy solving problems through technology and growing with my team. My work connects research with products, with a focus on AI and clusters.',
      'I currently lead AI development on the Development Environment Platform Team at Hyundai AutoEver. I design Agentic AI applications and the platforms that run them.',
    ],
    focusTitle: 'What I work on',
    focus: [
      {label: 'Agentic AI', description: 'Turning agents and domain tools into useful applications.'},
      {label: 'AI platforms', description: 'Kubernetes, GPUs, LLMOps, and operational automation.'},
      {label: 'Team leadership', description: 'Shaping architecture and ways of working together.'},
      {label: 'Technical depth', description: 'Applying computer vision and automotive research experience.'},
    ],
    pathTitle: 'Where the work began',
    path: [
      {period: '2025 - present', title: 'Hyundai AutoEver', description: 'AI platforms and Agentic AI for vehicle software verification'},
      {period: '2021 - 2024', title: 'MAXST', description: 'MLOps, hybrid Kubernetes, and digital twin platforms'},
      {period: '2012 - 2020', title: 'POSTECH', description: 'Computer vision, autonomous driving, and visual SLAM research'},
    ],
    linksTitle: 'Explore my work',
    portfolio: 'Selected project',
    portfolioDescription: 'A closer look at the Widearth platform and its implementation.',
    resume: 'Resume',
    resumeDescription: 'A concise overview of my experience and skills.',
    contact: 'Get in touch on LinkedIn',
  },
};

export default function About(): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const copy = COPY[currentLocale] ?? COPY.en;
  const portfolioPath =
    currentLocale === 'ko' ? '/wiki/knowledge/portfolio' : '/blog/widearth-digital-twins-platforms-at-maxst';

  return (
    <Layout title={copy.title} description={copy.lead}>
      <header className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 className={styles.name}>{copy.name}</h1>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.intro}>
            {copy.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <a className={styles.contact} href="https://www.linkedin.com/in/jyje" target="_blank" rel="noreferrer">
            {copy.contact} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main className={`container ${styles.main}`}>
        <section className={styles.section}>
          <h2>{copy.focusTitle}</h2>
          <div className={styles.focusGrid}>
            {copy.focus.map((item) => (
              <article className={styles.focus} key={item.label}>
                <h3>{item.label}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.section}>
          <h2>{copy.pathTitle}</h2>
          <ol className={styles.path}>
            {copy.path.map((item) => (
              <li key={item.title}>
                <span className={styles.period}>{item.period}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.section}>
          <h2>{copy.linksTitle}</h2>
          <div className={styles.links}>
            <Link to={portfolioPath}>
              <span>{copy.portfolio} <span aria-hidden="true">↗</span></span>
              <small>{copy.portfolioDescription}</small>
            </Link>
            <Link to="/resume">
              <span>{copy.resume} <span aria-hidden="true">↗</span></span>
              <small>{copy.resumeDescription}</small>
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
