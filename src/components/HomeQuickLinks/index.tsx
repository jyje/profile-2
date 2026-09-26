import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export type HomeQuickLink = {
  to: string;
  label: string;
  icon: ReactNode;
  emphasis?: boolean;
  groupEnd?: boolean;
};

type Props = {
  ariaLabel: string;
  items: HomeQuickLink[];
};

export default function HomeQuickLinks({ariaLabel, items}: Props): ReactNode {
  return (
    <nav className={styles.quickLinks} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li
            className={item.groupEnd ? styles.groupEnd : undefined}
            key={item.to}
          >
            <Link
              to={item.to}
              className={`${styles.link} ${item.emphasis ? styles.emphasis : ''}`}
            >
              <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
