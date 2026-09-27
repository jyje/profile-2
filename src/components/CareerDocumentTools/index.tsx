import Link from '@docusaurus/Link';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/700.css';
import {Button} from '@site/src/components/ui/button';
import styles from './styles.module.css';
import SiteBreadcrumbs, {useBreadcrumbLabels} from '@site/src/components/SiteBreadcrumbs';
import breadcrumbStyles from '@site/src/components/SiteBreadcrumbs/styles.module.css';

export default function CareerDocumentTools({locale, variant}: {locale: string; variant: 'resume' | 'cv'}) {
  const ko = locale === 'ko';
  const labels = useBreadcrumbLabels();
  return <><SiteBreadcrumbs className={`${breadcrumbStyles.career} ${variant === 'resume' ? breadcrumbStyles.summary : ''}`} items={[
    {label: labels.about, href: '/about/'},
    {label: variant === 'resume' ? (ko ? '이력서' : 'Resume') : (ko ? '상세 경력기술서' : 'Curriculum vitae')},
  ]} /><nav className={styles.tools} aria-label={ko ? '경력 문서' : 'Career documents'}>
    <Link to="/about/resume" aria-current={variant === 'resume' ? 'page' : undefined}>{ko ? '1페이지 이력서' : 'One-page resume'}</Link>
    <Link to="/about/cv" aria-current={variant === 'cv' ? 'page' : undefined}>{ko ? '상세 경력기술서' : 'Detailed CV'}</Link>
    <Button variant="outline" size="sm" onClick={() => window.print()}>{ko ? '인쇄 / PDF 저장' : 'Print / Save PDF'}</Button>
  </nav></>;
}
