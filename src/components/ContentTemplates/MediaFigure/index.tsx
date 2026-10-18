import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export type FigureItem = {image: string; alt: string; caption: string; credit_label?: string; credit_name?: string; credit_url?: string; source_label?: string; source_name?: string; source_url?: string};
function Figure({item}: {item: FigureItem}) {
  const image = useBaseUrl(item.image);
  return <figure className={styles.figure}>
    <img src={image} alt={item.alt} loading="lazy" />
    <figcaption>{item.caption}
      {item.credit_url && <><br />{item.credit_label} <a href={item.credit_url}>{item.credit_name}</a>
        {' '}{item.source_label} <a href={item.source_url}>{item.source_name}</a></>}
    </figcaption>
  </figure>;
}
export default function MediaFigure({items}: {items: FigureItem[]}) {
  return <>{items.map((item, i) => <Figure key={`${item.image}:${i}`} item={item} />)}</>;
}
