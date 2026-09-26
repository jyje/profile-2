import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Resume from '@site/src/components/Resume';
import ko from '@site/src/generated/resume.ko.json';
import en from '@site/src/generated/resume.en.json';

const DATA: Record<string, Record<string, unknown>> = {ko, en};

export default function ResumePage(): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const locale = currentLocale in DATA ? currentLocale : 'en';
  const title = locale === 'ko' ? '이력서' : 'Resume';

  return (
    <Layout title={title}>
      <Resume data={DATA[locale]} locale={locale} />
    </Layout>
  );
}
