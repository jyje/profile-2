import {useEffect, type ReactNode} from 'react';
import clsx from 'clsx';
import {Collapsible, useCollapsible} from '@docusaurus/theme-common';
import {isSamePath, useLocalPathname} from '@docusaurus/theme-common/internal';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import OriginalDropdown from '@docusaurus/theme-classic/lib/theme/NavbarItem/DropdownNavbarItem/Mobile';
import NavbarItem from '@theme/NavbarItem';
import NavbarNavLink from '@theme/NavbarItem/NavbarNavLink';
import type {Props} from '@theme/NavbarItem/DropdownNavbarItem/Mobile';

function SplitAboutMobile({items, className, position, onClick, ...props}: Props): ReactNode {
  const localPathname = useLocalPathname();
  const active = isSamePath(props.to, localPathname);
  const childActive = items.some((item) => isSamePath(item.to, localPathname));
  const {collapsed, toggleCollapsed, setCollapsed} = useCollapsible({
    initialState: () => !(active || childActive),
  });
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();

  useEffect(() => {
    if (active || childActive) setCollapsed(false);
  }, [active, childActive, setCollapsed]);

  return (
    <li className={clsx('menu__list-item', {'menu__list-item--collapsed': collapsed})}>
      <div
        className={clsx('menu__list-item-collapsible', {
          'menu__list-item-collapsible--active': active,
        })}>
        <NavbarNavLink
          className={clsx('menu__link menu__link--sublist', className)}
          {...props}
          label={currentLocale === 'ko' ? '소개' : props.label}
          onClick={onClick}
        />
        <button
          type="button"
          className="clean-btn menu__caret"
          aria-label={
            currentLocale === 'ko'
              ? collapsed ? '소개 메뉴 펼치기' : '소개 메뉴 접기'
              : collapsed ? 'Expand About menu' : 'Collapse About menu'
          }
          aria-expanded={!collapsed}
          onClick={toggleCollapsed}
        />
      </div>
      <Collapsible lazy as="ul" className="menu__list" collapsed={collapsed}>
        {items.map((item, index) => (
          <NavbarItem
            key={index}
            mobile
            isDropdownItem
            onClick={onClick}
            activeClassName="menu__link--active"
            {...item}
          />
        ))}
      </Collapsible>
    </li>
  );
}

export default function DropdownNavbarItemMobile(props: Props): ReactNode {
  if (props.className !== 'site-about-split') return <OriginalDropdown {...props} />;
  return <SplitAboutMobile {...props} />;
}
