import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import OriginalDefaultNavbarItem from '@docusaurus/theme-classic/lib/theme/NavbarItem/DefaultNavbarItem';
import type {Props} from '@theme/NavbarItem/DefaultNavbarItem';

function getLocalizedLabel(label: ReactNode, className: string | undefined, locale: string): ReactNode {
  if (locale !== 'ko') return label;
  if (className?.split(/\s+/).includes('site-blog-link')) return '블로그';
  if (className?.split(/\s+/).includes('site-wiki-link')) return '위키';
  return label;
}

export default function DefaultNavbarItem(props: Props): ReactNode {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const label = getLocalizedLabel(props.label, props.className, currentLocale);
  return <OriginalDefaultNavbarItem {...props} label={label} />;
}
