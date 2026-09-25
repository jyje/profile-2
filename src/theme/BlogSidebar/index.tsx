import React, {type ReactNode} from 'react';
import {useWindowSize} from '@docusaurus/theme-common';
import BlogSidebarDesktop from '@theme/BlogSidebar/Desktop';
import BlogSidebarMobile from '@theme/BlogSidebar/Mobile';
import type {Props} from '@theme/BlogSidebar';

export default function BlogSidebar({sidebar}: Props): ReactNode {
  // Keep this boundary aligned with the 920px layout rules in custom.css.
  const windowSize = useWindowSize({desktopBreakpoint: 919});
  if (!sidebar?.items.length) {
    return null;
  }
  return windowSize === 'mobile'
    ? <BlogSidebarMobile sidebar={sidebar} />
    : <BlogSidebarDesktop sidebar={sidebar} />;
}
