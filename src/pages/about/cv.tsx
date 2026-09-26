import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Resume from '@site/src/components/Resume';
import CareerDocumentTools from '@site/src/components/CareerDocumentTools';
import ko from '@site/src/generated/resume.ko.json';
import en from '@site/src/generated/resume.en.json';

export default function CVPage(): ReactNode {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const locale = currentLocale === 'ko' ? 'ko' : 'en';
  return <Layout title={locale === 'ko' ? '상세 경력기술서' : 'Curriculum vitae'}>
    <CareerDocumentTools locale={locale} variant="cv" />
    <Resume data={locale === 'ko' ? ko : en} locale={locale} />
  </Layout>;
}
