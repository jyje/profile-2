import {IconCopy, IconPrinter} from '@tabler/icons-react';
import {useEffect, useState} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';
import {Button} from '@site/src/components/ui/button';
import useCareerProfile from '@site/src/components/CareerDocuments/useCareerProfile';
import {careerRoles, profiles, defaultRole, documentLabels, type CareerLocale, type CareerRole, type CareerVariant} from '@site/src/components/CareerDocuments/profiles';
import styles from './styles.module.css';
import SiteBreadcrumbs, {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';
import breadcrumbStyles from '@site/src/components/SiteBreadcrumbs/styles.module.css';

export default function CareerDocumentTools({locale, variant}: {locale: CareerLocale; variant: CareerVariant}) {
  const ko = locale === 'ko';
  const labels = useBreadcrumbLabels();
  const {role, setRole, ready} = useCareerProfile();
  const location = useLocation();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => { setCopyState('idle'); }, [location.pathname, location.search, location.hash]);
  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    setShareUrl(url.href);
    try { await navigator.clipboard.writeText(url.href); setCopyState('copied'); }
    catch { setCopyState('manual'); }
  }
  return <>
    {variant !== 'resume' && <SiteBreadcrumbs className={breadcrumbStyles.career} items={[
      {label: labels.about, href: '/about/'}, {label: documentLabels[locale][variant]},
    ]} />}
    <div className={styles.tools} data-career-tools>
      <nav className={styles.documents} aria-label={ko ? '경력 문서' : 'Career documents'}>
        {(['resume', 'selected-cv', 'cv'] as const).map(document => <Link key={document}
          to={`/about/${document}?role=${role}`} aria-current={variant === document ? 'page' : undefined}>
          {documentLabels[locale][document]}
        </Link>)}
      </nav>
      <div className={styles.actions}>
        {variant !== 'cv' && <label className={styles.role}>
          <span>{ko ? '직무 관점' : 'Role focus'}</span>
          <select value={role} disabled={!ready} onChange={event => setRole(event.target.value as CareerRole)}>
            {careerRoles.map(key => <option value={key} key={key}>
              {key === defaultRole ? (ko ? '기본 - ' : 'Default - ') : ''}{profiles[key].title}
            </option>)}
          </select>
        </label>}
        <div className={styles.buttons}>
          <Button variant="outline" size="sm" disabled={!ready} onClick={copyLink}><IconCopy size={16} stroke={1.6} aria-hidden />{ko ? '링크 복사' : 'Copy link'}</Button>
          <Button variant="outline" size="sm" disabled={!ready} onClick={() => window.print()}><IconPrinter size={16} stroke={1.6} aria-hidden />{ko ? '인쇄 / PDF 저장' : 'Print / Save PDF'}</Button>
        </div>
      </div>
      <span role="status" className={styles.status}>{copyState === 'copied' ? (ko ? '링크를 복사했습니다.' : 'Link copied.') : copyState === 'manual' ? (ko ? '아래 링크를 복사해주세요.' : 'Copy the link below.') : ''}</span>
      {copyState === 'manual' && <input className={styles.shareUrl} aria-label={ko ? '공유 링크' : 'Share link'} readOnly value={shareUrl} onFocus={event => event.target.select()} />}
    </div>
  </>;
}
