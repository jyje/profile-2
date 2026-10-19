import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {useColorMode} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export type AnatomyItem = {
  /** Directory under static/anatomy/. The light page is the `<name>-light/` directory. */
  name: string;
  title: string;
};

export default function AnatomyFigure({items}: {items: AnatomyItem[]}): ReactNode {
  const {name, title} = items[0];
  const {colorMode} = useColorMode();
  const dark = useBaseUrl(`/anatomy/${name}/`);
  const light = useBaseUrl(`/anatomy/${name}-light/`);
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | undefined>();

  // The figure page is same-origin static HTML, so its card height can be read directly.
  const fit = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.documentElement) return;
    // Hide the frame's own scrollbar: the height below already fits the whole card.
    doc.documentElement.style.overflow = 'hidden';
    setHeight(Math.ceil(doc.documentElement.scrollHeight));
  }, []);

  useEffect(() => {
    // The server-rendered iframe can finish loading before React attaches onLoad.
    const doc = frame.current?.contentDocument;
    if (doc?.readyState === 'complete' && doc.location.href !== 'about:blank') fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  return (
    <iframe
      ref={frame}
      className={styles.frame}
      style={height ? {height} : undefined}
      src={colorMode === 'dark' ? dark : light}
      title={title}
      onLoad={fit}
    />
  );
}
