import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Item = {href: string; label: string};

export default function AboutSectionNav({label, current, items}: {
  label: string;
  current: string;
  items: Item[];
}) {
  return <nav className={styles.nav} aria-label={label} data-about-nav>
    {items.map(item => <Link key={item.href} to={item.href}
      aria-current={item.href === current ? 'page' : undefined}>
      {item.label}
    </Link>)}
  </nav>;
}
