import type {ReactNode} from 'react';
import styles from './styles.module.css';

export type FocusItem = {
  name: string;
  description: string;
};

export default function ListType2x2({items}: {items: FocusItem[]}): ReactNode {
  return (
    <ul className={styles.grid}>
      {items.map((item) => (
        <li className={styles.item} key={item.name}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
