import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {useColorMode} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export type AnatomyItem = {
  /** Root-relative static directory, for example /img/figures/raspberry-pi. Dark is index.html, light is light/index.html. */
  path: string;
};

const TITLES: Record<string, string> = {ko: '인터랙티브 그림', en: 'Interactive figure'};

export default function AnatomyFigure({items}: {items: AnatomyItem[]}): ReactNode {
  const {path} = items[0];
  const {colorMode} = useColorMode();
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const dark = useBaseUrl(`${path}/`);
  const light = useBaseUrl(`${path}/light/`);
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
      title={TITLES[currentLocale] ?? TITLES.en}
      onLoad={fit}
    />
  );
}
