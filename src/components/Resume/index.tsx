import type {ReactNode} from 'react';
import {marked} from 'marked';

import styles from './styles.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = Record<string, any>;

const TITLES: Record<string, Record<string, string>> = {
  ko: {
    work: '경력',
    projects: '프로젝트',
    education: '학력',
    skills: '기술',
    certificates: '자격증',
    publications: '논문',
    volunteer: '기타 활동',
    languages: '언어',
    present: '현재',
  },
  en: {
    work: 'Work',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    certificates: 'Certificates',
    publications: 'Publications',
    volunteer: 'Other Activities',
    languages: 'Languages',
    present: 'present',
  },
};

const md = (s: unknown) => marked.parseInline(String(s ?? '').trim(), {async: false}) as string;
const Html = ({text}: {text: unknown}) => <span dangerouslySetInnerHTML={{__html: md(text)}} />;

const ym = (d?: string) => (d ? d.slice(0, 7) : '');
const period = (start?: string, end: unknown, present: string) =>
  `${ym(start)} – ${typeof end === 'string' && end ? ym(end) : present}`;

function Link({href, children}: {href?: string; children: ReactNode}) {
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

function Card({icon, title, sub, date, children}: {icon?: string; title: ReactNode; sub?: ReactNode; date?: string; children?: ReactNode}) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>
            {icon && <span className={styles.icon}>{icon}</span>}
            {title}
          </h3>
          {sub && <div className={styles.cardSub}>{sub}</div>}
        </div>
        {date && <div className={styles.date}>{date}</div>}
      </header>
      {children}
    </article>
  );
}

function Items({items}: {items?: {header?: string; content?: string}[]}) {
  if (!items?.length) return null;
  return (
    <ul className={styles.items}>
      {items.map((it, i) => (
        <li key={i}>
          {it.header && <strong>{it.header}</strong>}
          {it.header && it.content ? ' — ' : ''}
          <Html text={it.content} />
        </li>
      ))}
    </ul>
  );
}

function Section({title, children}: {title: string; children: ReactNode}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function Resume({data, locale}: {data: Data; locale: string}): ReactNode {
  const t = TITLES[locale] ?? TITLES.en;
  const b = data.basics ?? {};
  const abstract = String(b.contents?.[`resume-${locale}`]?.abstract ?? '').replace(/<span[^>]*>(.*?)<\/span>/g, '$1');
  const nameEn = b['name-english'];

  return (
    <div className={styles.resume}>
      <header className={styles.top}>
        <h1 className={styles.name}>
          {b.name}
          {nameEn && locale === 'ko' && <small> {nameEn}</small>}
        </h1>
        <p className={styles.label}>{b.label}</p>
        <p className={styles.contact}>
          {[b.location?.city, b.email && <a key="m" href={`mailto:${b.email}`}>{b.email}</a>, ...(b.profiles ?? []).map((p: Data) => (
            <a key={p.network} href={p.url} target="_blank" rel="noreferrer">
              {p.network}
            </a>
          ))]
            .filter(Boolean)
            .map((node, i) => (
              <span key={i}>{node}</span>
            ))}
        </p>
        {abstract && <div className={styles.abstract} dangerouslySetInnerHTML={{__html: marked.parse(abstract, {async: false}) as string}} />}
      </header>

      {data.work?.length > 0 && (
        <Section title={t.work}>
          {data.work.map((w: Data) => (
            <Card key={w.company + w.startDate} icon={w.headerIcon} title={<Link href={w.website}>{w.company}</Link>} sub={w.position} date={period(w.startDate, w.endDate, t.present)}>
              <Items items={w.roles?.items} />
            </Card>
          ))}
        </Section>
      )}

      {data.projects?.length > 0 && (
        <Section title={t.projects}>
          {data.projects.map((p: Data) => (
            <Card key={p.position + p.startDate} icon={p.headerIcon} title={p.position} sub={[p.company, p.roles?.description].filter(Boolean).join(' · ')} date={period(p.startDate, p.endDate, t.present)}>
              <Items items={p.results?.items} />
            </Card>
          ))}
        </Section>
      )}

      {data.education?.length > 0 && (
        <Section title={t.education}>
          {data.education.map((e: Data) => (
            <Card key={e.institution + e.startDate} icon={e.headerIcon} title={<Link href={e.website}>{e.institution}</Link>} sub={[e.studyType, e.area, e.gpa].filter(Boolean).join(' · ')} date={period(e.startDate, e.endDate, t.present)}>
              {e.keywords?.length > 0 && <p className={styles.tags}>{e.keywords.join(' · ')}</p>}
              {e.thesis && <p className={styles.note}>{e.thesis}</p>}
            </Card>
          ))}
        </Section>
      )}

      {data.skills?.length > 0 && (
        <Section title={t.skills}>
          <dl className={styles.skills}>
            {data.skills.map((s: Data) => (
              <div key={s.name}>
                <dt>{s.name}</dt>
                <dd>
                  {(s.keywords ?? []).map((k: string) => {
                    const strong = k.endsWith('*');
                    const label = k.replace(/\*$/, '');
                    return (
                      <span key={k} className={strong ? styles.chipStrong : styles.chip}>
                        {label}
                      </span>
                    );
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {data.certificates?.length > 0 && (
        <Section title={t.certificates}>
          <ul className={styles.plain}>
            {data.certificates.map((c: Data) => (
              <li key={c.title}>
                <Link href={c.website}>
                  <strong>{c.title}</strong>
                </Link>{' '}
                <span className={styles.note}>
                  {c.organization_short ?? c.organization} · {ym(c.verified)}
                  {c.expired ? ` → ${ym(c.expired)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.volunteer?.length > 0 && (
        <Section title={t.volunteer}>
          {data.volunteer.map((v: Data) => (
            <Card key={v.organization + v.startDate} title={<Link href={v.website}>{v.organization}</Link>} sub={v.position} date={period(v.startDate, v.endDate, t.present)}>
              <ul className={styles.items}>
                {(v.highlights ?? []).map((h: Data) => (
                  <li key={h.title}>
                    <Link href={h.website}>
                      <strong>{h.title}</strong>
                    </Link>
                    {h.description ? ` — ${h.description}` : ''}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </Section>
      )}

      {data.publications?.length > 0 && (
        <Section title={t.publications}>
          <ul className={styles.plain}>
            {data.publications.map((p: Data) => (
              <li key={p.name}>
                <Link href={p.website}>
                  <strong>{p.name}</strong>
                </Link>
                <div className={styles.note}>
                  <Html text={p.authors} /> · {p.publisher}
                  {p.contribution ? ` · ${p.contribution}` : ''} · {ym(p.releaseDate)}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.languages?.length > 0 && (
        <Section title={t.languages}>
          <p className={styles.tags}>{data.languages.map((l: Data) => `${l.language} (${l.fluency})`).join(' · ')}</p>
        </Section>
      )}
    </div>
  );
}
