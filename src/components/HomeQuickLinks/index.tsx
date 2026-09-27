import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export type HomeQuickLink = {
  to: string;
  label: string;
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
          <li key={item.to}>
            <Link to={item.to} className={styles.link}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
