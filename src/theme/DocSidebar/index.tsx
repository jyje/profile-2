import React, {type ReactNode} from 'react';
import {useWindowSize} from '@docusaurus/theme-common';
import DocSidebarDesktop from '@theme/DocSidebar/Desktop';
import DocSidebarMobile from '@theme/DocSidebar/Mobile';
import type {Props} from '@theme/DocSidebar';

export default function DocSidebar(props: Props): ReactNode {
  // Keep this boundary aligned with the 920px layout rules in custom.css.
  const windowSize = useWindowSize({desktopBreakpoint: 919});

  return (
    <>
      {(windowSize === 'desktop' || windowSize === 'ssr') &&
        <DocSidebarDesktop {...props} />}
      {windowSize === 'mobile' && <DocSidebarMobile {...props} />}
    </>
  );
}
