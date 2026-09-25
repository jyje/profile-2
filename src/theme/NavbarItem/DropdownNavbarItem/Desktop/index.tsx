import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import OriginalDropdown from '@docusaurus/theme-classic/lib/theme/NavbarItem/DropdownNavbarItem/Desktop';
import NavbarItem from '@theme/NavbarItem';
import NavbarNavLink from '@theme/NavbarItem/NavbarNavLink';
import type {Props} from '@theme/NavbarItem/DropdownNavbarItem/Desktop';

function SplitAboutDropdown({items, position, className, onClick, ...props}: Props): ReactNode {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const closeOutside = (event: MouseEvent | TouchEvent | FocusEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('touchstart', closeOutside);
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('touchstart', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={clsx('navbar__item', 'dropdown', 'dropdown--nocaret', className, {
        'dropdown--right': position === 'right',
        'dropdown--show': open,
      })}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
      }}>
      <NavbarNavLink
        className="navbar__link site-about-split__link"
        {...props}
        label={currentLocale === 'ko' ? '소개' : props.label}
      />
      <button
        type="button"
        className="site-about-split__toggle"
        aria-label={currentLocale === 'ko' ? '소개 메뉴 펼치기' : 'Expand About menu'}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}>
        <span className="site-about-split__caret" aria-hidden="true" />
      </button>
      <ul id={menuId} className="dropdown__menu">
        {items.map((item, index) => (
          <NavbarItem
            key={index}
            isDropdownItem
            activeClassName="dropdown__link--active"
            {...item}
          />
        ))}
      </ul>
    </div>
  );
}

export default function DropdownNavbarItemDesktop(props: Props): ReactNode {
  if (props.className !== 'site-about-split') return <OriginalDropdown {...props} />;
  return <SplitAboutDropdown {...props} />;
}
