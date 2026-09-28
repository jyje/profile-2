import type {ReactNode} from 'react';
import {marked} from 'marked';
import type {CareerLocale, CareerProfile, CareerRole} from '@site/src/components/CareerDocuments/profiles';
import styles from './styles.module.css';

type Data = Record<string, any>;
const inline = (value: unknown) => <span dangerouslySetInnerHTML={{__html: marked.parseInline(String(value ?? ''), {async: false}) as string}} />;
const date = (value?: string) => value?.slice(0, 7) ?? '';
const period = (entry: Data, locale: CareerLocale) => `${date(entry.startDate)} - ${typeof entry.endDate === 'string' ? date(entry.endDate) : locale === 'ko' ? '현재' : 'present'}`;
const labels = {
  ko: {projects: '주요 프로젝트', work: '경력', skills: '기술', education: '학력', certificates: '자격 취득 이력', volunteer: '관련 활동', languages: '언어'},
  en: {projects: 'Selected projects', work: 'Experience', skills: 'Skills', education: 'Education', certificates: 'Certification history', volunteer: 'Related activities', languages: 'Languages'},
};
function Items({items, field}: {items?: Data[]; field: 'summary' | 'detail'}) {
  return items?.length ? <ul>{items.map((item, index) => <li key={index}>{item.header && <strong>{item.header}{item.content ? ': ' : ''}</strong>}{inline(item[field] ?? item.content)}</li>)}</ul> : null;
}
function Section({title, children}: {title: string; children: ReactNode}) {
  return <section className={styles.section}><h2>{title}</h2>{children}</section>;
}
export default function SelectedCV({data, locale, profile, role}: {data: Data; locale: CareerLocale; profile: CareerProfile; role: CareerRole}) {
  const layout = profile.selectedCv; const basics = data.basics; const t = labels[locale];
  return <article className={styles.page} data-career-document="selected-cv" data-career-role={role}>
    <header className={styles.header}>
      <h1>{basics.name}</h1><p className={styles.title}>{profile.title}</p>
      <div className={styles.contact}>
        <a href={`mailto:${basics.email}`}>{basics.email}</a>
        <a href={basics.website}>{basics.website.replace(/^https?:\/\//, '')}</a>
        {basics.profiles.map((p: Data) => <a key={p.network} href={p.url}>{p.network}</a>)}
      </div>
      <p>{profile.summary[locale]}</p>
    </header>
    {(['projects', 'work'] as const).map(kind => layout[kind].length > 0 && <Section key={kind} title={t[kind]}>
      {layout[kind].map(index => {const entry = data[kind][index]; return <section className={styles.entry} key={index} id={`${kind}-${index}`}>
        <header className={styles.entryHeader}>
          <h3>{kind === 'projects' ? entry.position : entry.company}</h3>
          <p className={styles.meta}>{period(entry, locale)}</p>
          <p>{kind === 'projects' ? entry.company : entry.position}</p>
        </header>
        {entry.roles?.description && <p>{inline(entry.roles.description)}</p>}
        {kind === 'projects' && entry.description && <p>{inline(entry.description)}</p>}
        <Items items={entry.roles?.items} field={kind === 'projects' ? layout.projectText[index] : layout.workText[index]} /><Items items={entry.results?.items} field={kind === 'projects' ? layout.projectText[index] : layout.workText[index]} />
      </section>;})}
    </Section>)}
    {layout.skills.length > 0 && <Section title={t.skills}><dl className={styles.skills}>
      {layout.skills.map(index => <div key={index}><dt>{data.skills[index].name}</dt><dd>{data.skills[index].keywords.map((keyword: string) => keyword.replace(/\*$/, '')).join(' · ')}</dd></div>)}
    </dl></Section>}
    {layout.volunteer.length > 0 && <Section title={t.volunteer}>{layout.volunteer.map(index => {const entry = data.volunteer[index]; return <section className={styles.entry} key={index}>
      <header className={styles.entryHeader}><h3>{entry.position}</h3><p className={styles.meta}>{period(entry, locale)}</p><p><a href={entry.website}>{entry.organization}</a></p></header>
      <ul>{entry.highlights?.map((item: Data) => <li key={item.title}><a href={item.website}>{item.title}</a>{item.description && <>: {inline(item.description)}</>}</li>)}</ul>
    </section>;})}</Section>}
    {layout.education.length > 0 && <Section title={t.education}>{layout.education.map(index => {const entry=data.education[index]; return <section className={styles.entry} key={index}>
      <header className={styles.entryHeader}><h3>{entry.institution}</h3><p className={styles.meta}>{period(entry, locale)}</p></header>
      <p>{entry.studyType} · {entry.area}</p>{entry.thesis && <p>{entry.thesis}</p>}
    </section>;})}</Section>}
    {layout.certificates.length > 0 && <Section title={t.certificates}>
      <p className={styles.meta}>{locale === 'ko' ? '취득 - 만료' : 'Issued - expiry'}</p>
      <ul className={styles.certificates}>{layout.certificates.map(index => {const entry=data.certificates[index]; return <li key={index}><a href={entry.website}>{entry.title}</a> · {entry.organization_short ?? entry.organization} <span className={styles.meta}>{date(entry.verified)}{entry.expired ? ` - ${date(entry.expired)}` : ''}</span></li>;})}</ul>
    </Section>}
    {layout.languages.length > 0 && <Section title={t.languages}><p>{layout.languages.map(index => `${data.languages[index].language}: ${data.languages[index].fluency}`).join(' · ')}</p></Section>}
  </article>;
}
