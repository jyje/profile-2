import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import OriginalTag from '@theme-original/Tag';
import type {Props} from '@theme/Tag';

// Keep the shared blog/wiki tag destination; delegate rendering to the theme.
export default function Tag({permalink, ...props}: Props): ReactNode {
  const slug = permalink.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1) ?? '';
  const destination = useBaseUrl(`/tags/${slug}`);
  return <OriginalTag {...props} permalink={destination} />;
}
