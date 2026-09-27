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

export default function HomeQuickLinks({ariaLabel, items}: Props) {
  return (
    <nav className={styles.quickLinks} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.to} className={item.groupEnd ? styles.groupEnd : undefined}>
            <Link to={item.to} title={item.label} className={`${styles.link} ${item.emphasis ? styles.emphasis : ''}`}>
              <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
