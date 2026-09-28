import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import SelectedCV from '@site/src/components/SelectedCV';
import CareerDocumentTools from '@site/src/components/CareerDocumentTools';
import useCareerProfile from '@site/src/components/CareerDocuments/useCareerProfile';
import {documentLabels} from '@site/src/components/CareerDocuments/profiles';
import ko from '@site/src/generated/resume.ko.json';
import en from '@site/src/generated/resume.en.json';

export default function SelectedCVPage() {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const locale = currentLocale === 'ko' ? 'ko' : 'en';
  const {role, profile} = useCareerProfile();
  return <Layout title={documentLabels[locale]['selected-cv']}>
    <CareerDocumentTools locale={locale} variant="selected-cv" />
    <SelectedCV data={locale === 'ko' ? ko : en} locale={locale} role={role} profile={profile} />
  </Layout>;
}
