import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import {mergeSearchStrings, useHistorySelector} from '@docusaurus/theme-common';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import type {LinkLikeNavbarItemProps} from '@theme/NavbarItem';
import type {Props} from '@theme/NavbarItem/LocaleDropdownNavbarItem';

export default function LocaleDropdownNavbarItem({
  mobile,
  dropdownItemsBefore,
  dropdownItemsAfter,
  queryString,
  ...props
}: Props): ReactNode {
  const {
    siteConfig,
    i18n: {currentLocale, locales, localeConfigs},
  } = useDocusaurusContext();
  const alternatePageUtils = useAlternatePageUtils();
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);

  const getURL = (locale: string) => {
    const localeConfig = localeConfigs[locale];
    if (!localeConfig) throw new Error(`No locale configuration found for ${locale}`);
    const isSameDomain = localeConfig.url === siteConfig.url;
    const path = alternatePageUtils.createUrl({locale, fullyQualified: !isSameDomain});
    const finalSearch = mergeSearchStrings([search, queryString], 'append');
    return `${isSameDomain ? `pathname://${path}` : path}${finalSearch}${hash}`;
  };

  const localeItems = locales.map((locale): LinkLikeNavbarItemProps => {
    const localeConfig = localeConfigs[locale];
    if (!localeConfig) throw new Error(`No locale configuration found for ${locale}`);
    return {
      label: localeConfig.label,
      lang: localeConfig.htmlLang,
      to: getURL(locale),
      target: '_self',
      autoAddBaseUrl: false,
      className: locale === currentLocale
        ? mobile ? 'menu__link--active' : 'dropdown__link--active'
        : '',
    };
  });

  return (
    <DropdownNavbarItem
      {...props}
      mobile={mobile}
      label={
        <>
          <IconLanguage className="site-language-icon" />
          Language
        </>
      }
      items={[...dropdownItemsBefore, ...localeItems, ...dropdownItemsAfter]}
    />
  );
}
