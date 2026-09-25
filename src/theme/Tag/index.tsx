import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import type {Props} from '@theme/Tag';

import styles from './styles.module.css';

export default function Tag({permalink, label, count, description}: Props): ReactNode {
  const slug = permalink.split(/[?#]/, 1)[0].split('/').filter(Boolean).at(-1) ?? '';
  return (
    <Link
      to={`/tags/${slug}`}
      rel="tag"
      title={description}
      className={clsx(styles.tag, count ? styles.tagWithCount : styles.tagRegular)}>
      {label}
      {count && <span>{count}</span>}
    </Link>
  );
}
