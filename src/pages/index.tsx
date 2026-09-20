import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

type Copy = {
  name: string;
  role: string;
  intro: string[];
  strengths: {icon: string; title: string; text: string}[];
  cards: {title: string; text: string; to: string}[];
};

const COPY: Record<string, Copy> = {
  ko: {
    name: '전제영 (Jeayoung Jeon)',
    role: 'AI Platform Engineer',
    intro: [
      '서울에서 활동하는 AI 플랫폼 엔지니어입니다. 기술로 문제를 풀고, 팀과 함께 성장하는 것을 추구합니다.',
      '현재 현대오토에버 개발환경플랫폼팀에서 AI 개발을 리드하고 있습니다.',
    ],
    strengths: [
      {icon: '🤖', title: 'Agentic AI 개발', text: 'Agentic AI 앱과 인프라를 Zero to Product로 만듭니다.'},
      {icon: '🐳', title: '클라우드 네이티브 운영', text: 'Agentic AI 앱, AIOps, GPU 플랫폼을 구현하고 운영합니다.'},
      {icon: '🤝', title: '팀 리딩', text: '10인 내외 팀에서 협업, 아키텍처, 플랫폼 엔지니어링을 이끕니다.'},
    ],
    cards: [
      {title: '이력서', text: '경력, 성과, 자격을 담은 요약 문서', to: '/resume'},
      {title: '위키', text: '계속 고쳐 쓰는 지식기반 노트', to: '/wiki'},
      {title: '블로그', text: '기술 포스팅과 회고', to: '/blog'},
    ],
  },
  en: {
    name: 'Jeayoung Jeon',
    role: 'AI Platform Engineer',
    intro: [
      'I am an AI platform engineer based in Seoul. I like solving problems with technology and growing together with my team.',
      'I currently lead AI development in the Developer Environment Platform team at Hyundai AutoEver.',
    ],
    strengths: [
      {icon: '🤖', title: 'Agentic AI development', text: 'I build Agentic AI apps and their infrastructure from zero to product.'},
      {icon: '🐳', title: 'Cloud-native operations', text: 'I implement and operate Agentic AI apps, AIOps, and GPU platforms.'},
      {icon: '🤝', title: 'Team leading', text: 'I lead collaboration, architecture, and platform engineering in teams of about ten.'},
    ],
    cards: [
      {title: 'Resume', text: 'A summary of career, achievements, and certificates', to: '/resume'},
      {title: 'Wiki', text: 'Knowledge-base notes that keep being revised', to: '/wiki'},
      {title: 'Blog', text: 'Technical posts and retrospectives', to: '/blog'},
    ],
  },
};

export default function Home(): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const c = COPY[currentLocale] ?? COPY.en;

  return (
    <Layout title={c.role} description={c.intro[0]}>
      <header className={styles.hero}>
        <div className="container">
          <p className={styles.role}>{c.role}</p>
          <h1 className={styles.name}>{c.name}</h1>
          {c.intro.map((line) => (
            <p key={line} className={styles.intro}>
              {line}
            </p>
          ))}
        </div>
      </header>
      <main className="container">
        <section className={styles.strengths}>
          {c.strengths.map((s) => (
            <div key={s.title} className={styles.strength}>
              <span className={styles.icon} aria-hidden="true">
                {s.icon}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </section>
        <section className={styles.cards}>
          {c.cards.map((card) => (
            <Link key={card.to} to={card.to} className={styles.card}>
              <h3>{card.title} →</h3>
              <p>{card.text}</p>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
