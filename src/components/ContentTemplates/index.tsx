import type {ReactNode} from 'react';
import AnatomyFigure, {type AnatomyItem} from './AnatomyFigure';
import ListType2x2, {type FocusItem} from './ListType2x2';
import ListTypeImageHeader, {type CareerItem} from './ListTypeImageHeader';
import MediaFigure, {type FigureItem} from './MediaFigure';

type Props = {
  type: 'list-type-2x2' | 'list-type-image-header' | 'media-figure' | 'anatomy-figure';
  itemsJson: string;
};

export default function ContentTemplate({type, itemsJson}: Props): ReactNode {
  const items = JSON.parse(itemsJson) as FocusItem[] | CareerItem[] | AnatomyItem[];
  if (type === 'media-figure') return <MediaFigure items={JSON.parse(itemsJson) as FigureItem[]} />;

  if (type === 'list-type-2x2') {
    return <ListType2x2 items={items as FocusItem[]} />;
  }

  if (type === 'list-type-image-header') {
    return <ListTypeImageHeader items={items as CareerItem[]} />;
  }

  if (type === 'anatomy-figure') {
    return <AnatomyFigure items={items as AnatomyItem[]} />;
  }

  return null;
}
