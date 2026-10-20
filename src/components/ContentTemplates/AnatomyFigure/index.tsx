import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {useColorMode} from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export type AnatomyItem = {
  /** Root-relative static directory, for example /img/figures/raspberry-pi. Dark is index.html, light is light/index.html. */
  path: string;
};

const EMBED_STYLE_ID = 'anatomy-embed';
const TITLES: Record<string, string> = {ko: '인터랙티브 그림', en: 'Interactive figure'};

export default function AnatomyFigure({items}: {items: AnatomyItem[]}): ReactNode {
  const {path} = items[0];
  const {colorMode} = useColorMode();
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const dark = useBaseUrl(`${path}/`);
  const light = useBaseUrl(`${path}/light/`);
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | undefined>();

  // The figure page is same-origin static HTML. Show only its card: drop the page margins and the
  // legend a full page carries (an embed build has neither), then size the frame to the card.
  const fit = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.documentElement) return;
    if (!doc.getElementById(EMBED_STYLE_ID)) {
      const style = doc.createElement('style');
      style.id = EMBED_STYLE_ID;
      style.textContent = '.iso-page{width:100%!important;margin:0!important}.iso-figure{margin:0!important}.iso-legend{display:none!important}';
      doc.head.append(style);
    }
    // Hide the frame's own scrollbar: the height below already fits the whole card.
    doc.documentElement.style.overflow = 'hidden';
    const card = doc.querySelector('.iso-figure');
    setHeight(Math.ceil(card ? card.getBoundingClientRect().height : doc.documentElement.scrollHeight));
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
