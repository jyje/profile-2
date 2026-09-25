import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export type CareerItem = {
  name: string;
  image?: string;
  description?: string;
  start?: number | string;
  end?: number | string | null;
};

function CareerRow({item, currentLabel}: {item: CareerItem; currentLabel: string}): ReactNode {
  const image = item.image ? useBaseUrl(item.image) : undefined;
  const period = item.start
    ? `${item.start} - ${item.end || currentLabel}`
    : '';

  return (
    <li className={styles.row}>
      <span className={styles.period}>{period}</span>
      <span className={styles.imageColumn}>
        {image ? <img className={styles.image} src={image} alt={`${item.name} logo`} loading="lazy" /> : null}
      </span>
      <div className={styles.details}>
        <h3>{item.name}</h3>
        {item.description ? <p>{item.description}</p> : null}
      </div>
    </li>
  );
}

export default function ListTypeImageHeader({items}: {items: CareerItem[]}): ReactNode {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const currentLabel = currentLocale === 'ko' ? '현재' : 'Present';

  return (
    <ol className={styles.list}>
      {items.map((item) => <CareerRow key={`${item.name}-${item.start ?? ''}`} item={item} currentLabel={currentLabel} />)}
    </ol>
  );
}
