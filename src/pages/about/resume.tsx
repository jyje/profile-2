import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import ResumeSummary from '@site/src/components/ResumeSummary';
import CareerDocumentTools from '@site/src/components/CareerDocumentTools';
import ko from '@site/src/generated/resume.ko.json';
import en from '@site/src/generated/resume.en.json';

const DATA: Record<string, Record<string, unknown>> = {ko, en};

export default function ResumePage(): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const locale = currentLocale === 'ko' ? 'ko' : 'en';
  const title = locale === 'ko' ? '이력서' : 'Resume';

  return (
    <Layout title={title}>
      <CareerDocumentTools locale={locale} variant="resume" />
      <ResumeSummary data={DATA[locale]} locale={locale} />
    </Layout>
  );
}
