import type {ReactNode} from 'react';
import {marked} from 'marked';
import layout from '@site/src/generated/career-layout.json';
import styles from './styles.module.css';

type Data = Record<string, any>;
const text = (value: unknown) => <span dangerouslySetInnerHTML={{__html: marked.parseInline(String(value ?? ''), {async: false}) as string}} />;
const date = (value?: string) => value?.slice(0, 7) ?? '';
const range = (item: Data, ko: boolean) => `${date(item.startDate)} - ${typeof item.endDate === 'string' ? date(item.endDate) : ko ? '현재' : 'present'}`;
const label = {ko: {work: '경력', projects: '주요 프로젝트', education: '학력', skills: '기술', certificates: '자격 취득 이력', languages: '언어'}, en: {work: 'Experience', projects: 'Selected projects', education: 'Education', skills: 'Skills', certificates: 'Certification history', languages: 'Languages'}};

export default function ResumeSummary({data, locale}: {data: Data; locale: 'ko' | 'en'}): ReactNode {
  const ko = locale === 'ko'; const t = label[locale]; const basics = data.basics;
  const section = (title: string, body: ReactNode) => <section><h2>{title}</h2>{body}</section>;
  return <article className={styles.page} data-career-document="resume">
    <header className={styles.header}>
      <h1>{basics.name}<small>{basics.label}</small></h1>
      <div className={styles.contact}>
        <a href={`mailto:${basics.email}`}>{basics.email}</a>
        <a href={basics.website}>{basics.website.replace(/^https?:\/\//, '')}</a>
        {basics.profiles.map((p: Data) => <a key={p.network} href={p.url}>{p.network}</a>)}
      </div>
      <p>{layout.summary[locale]}</p>
    </header>
    <div className={styles.columns}>
      <div>
        {(['work', 'projects'] as const).map(kind => <section key={kind}><h2>{t[kind]}</h2>
          {layout[kind].map(selection => { const item = data[kind][selection.index]; const bullets = kind === 'work' ? item.roles?.items : item.results?.items;
            return <section className={styles.entry} key={selection.index} id={`${kind}-${selection.index}`}>
              <h3>{kind === 'work' ? item.company : item.position}</h3>
              <div className={styles.meta}>{range(item, ko)} · {kind === 'work' ? item.position : item.company}</div>
              <ul>{selection.items.map(index => <li key={index}>{bullets[index].header && <strong>{bullets[index].header}: </strong>}{text(bullets[index].content)}</li>)}</ul>
            </section>;
          })}
        </section>)}
        {section(t.education, layout.education.map(index => {const item = data.education[index]; return <section className={styles.entry} key={index} id={`education-${index}`}>
          <h3>{item.institution}</h3><div className={styles.meta}>{range(item, ko)}</div>
          <p>{item.studyType} · {item.area}</p>
        </section>;}))}
      </div>
      <aside>
        {section(t.skills, layout.skills.map(selection => {const item = data.skills[selection.index]; return <section className={styles.entry} key={selection.index} id={`skills-${selection.index}`}>
          <h3>{item.name}</h3><p>{selection.keywords.map(index => item.keywords[index].replace(/\*$/, '')).join(' · ')}</p>
        </section>;}))}
        {section(t.certificates, <><p className={styles.meta}>{ko ? '취득 - 만료' : 'Issued - expiry'}</p><ul className={styles.plain}>{layout.certificates.map(index => {const item = data.certificates[index]; return <li key={index}><a href={item.website}><strong>{item.title}</strong></a><span>{date(item.verified)}{item.expired ? ` - ${date(item.expired)}` : ''}</span></li>;})}</ul></>)}
        {section(t.languages, <p>{layout.languages.map(index => `${data.languages[index].language}: ${data.languages[index].fluency}`).join(' · ')}</p>)}
      </aside>
    </div>
  </article>;
}
