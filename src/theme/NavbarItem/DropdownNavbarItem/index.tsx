import type {ReactNode} from 'react';
import OriginalDropdown from '@theme-original/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import type {Props} from '@theme/NavbarItem/DropdownNavbarItem';

// Only customize the language label after the original locale component has
// generated its links. All dropdown interactions stay with the original theme.
export default function DropdownNavbarItem(props: Props): ReactNode {
  const isLanguage = props.className?.split(/\s+/).includes('site-locale-compact');
  const label = isLanguage ? (
    <><IconLanguage className="site-language-icon" />Language</>
  ) : props.label;
  return <OriginalDropdown {...props} label={label} />;
}
