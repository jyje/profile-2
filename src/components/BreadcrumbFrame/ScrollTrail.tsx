import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Decorate the original list in place: hierarchy, links and JSON-LD stay with
// Docusaurus/SiteBreadcrumbs. No copied theme renderer or relocated DOM nodes.
export default function ScrollTrail({children}: {children: ReactNode}) {
  const root = useRef<HTMLDivElement>(null);
  const {pathname} = useLocation();
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const [edges, setEdges] = useState({before: false, after: false, homeWidth: 0, beforeWidth: 36});
  const ko = currentLocale === 'ko';

  useEffect(() => {
    const host = root.current;
    const list = host?.querySelector<HTMLUListElement>('ul.breadcrumbs');
    if (!host || !list) return;
    let alive = true;
    let drag: {id: number; x: number; left: number; moved: boolean} | undefined;
    let suppressClick = false;
    const home = list.firstElementChild as HTMLElement | null;
    const measure = () => {
      const view = list.getBoundingClientRect();
      const homeWidth = home?.getBoundingClientRect().width ?? 0;
      const firstVisible = [...list.children].slice(1).map(item => item.getBoundingClientRect())
        .find(box => box.left >= view.left + homeWidth + 36 && box.right <= view.right + 1);
      const next = {before: list.scrollLeft > 1,
        after: list.scrollWidth - list.clientWidth - list.scrollLeft > 1,
        homeWidth, beforeWidth: firstVisible ? Math.max(36, firstVisible.left - view.left - homeWidth) : 36};
      setEdges(previous => previous.before === next.before && previous.after === next.after && previous.homeWidth === next.homeWidth && previous.beforeWidth === next.beforeWidth ? previous : next);
    };
    const revealItem = (target: Element | null) => {
      const item = target?.closest<HTMLElement>('.breadcrumbs__item');
      if (!item || item === home) return;
      const view = list.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      const start = view.left + (home?.offsetWidth ?? 0) + 36;
      const end = view.right - 36;
      if (box.left < start) list.scrollLeft -= start - box.left;
      else if (box.right > end) list.scrollLeft += box.right - end;
      measure();
    };
    const focusItem = (event: FocusEvent) => revealItem(event.target as Element);
    const revealTail = () => {
      // Keep full text for native tooltips and assistive technology. CSS alone
      // abbreviates the visible label, including the original wiki spans.
      list.querySelectorAll<HTMLElement>('.breadcrumbs__link').forEach(link => {
        if (link.textContent?.trim()) link.title = link.textContent.trim();
      });
      if (list.contains(document.activeElement)) {
        revealItem(document.activeElement);
        measure();
        return;
      }
      list.scrollLeft = list.scrollWidth;
      measure();
    };
    const resize = new ResizeObserver(revealTail);
    resize.observe(list);
    const observeItems = () => {
      resize.disconnect();
      resize.observe(list);
      for (const item of list.children) resize.observe(item);
      revealTail();
    };
    const mutations = new MutationObserver(observeItems);
    mutations.observe(list, {childList: true, characterData: true, subtree: true});
    const down = (event: PointerEvent) => {
      suppressClick = false;
      if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as Element).closest('.breadcrumbs__item') === home) return;
      drag = {id: event.pointerId, x: event.clientX, left: list.scrollLeft, moved: false};
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId || !(event.buttons & 1)) return;
      if (!drag.moved && Math.abs(event.clientX - drag.x) < 6) return;
      drag.moved = true;
      suppressClick = true;
      list.setPointerCapture(event.pointerId);
      list.dataset.dragging = 'true';
      list.scrollLeft = drag.left + drag.x - event.clientX;
      event.preventDefault();
    };
    const up = () => {drag = undefined; delete list.dataset.dragging;};
    const click = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      if (event.detail === 0) return; // Never consume keyboard activation.
      event.preventDefault();
      event.stopPropagation();
    };
    const dragStart = (event: DragEvent) => event.preventDefault();
    const wheel = (event: WheelEvent) => {
      // Shift-wheel axis mapping differs by browser/OS. Leave ordinary vertical
      // page scrolling and native horizontal trackpad gestures untouched.
      if (!event.shiftKey || event.deltaX || !event.deltaY) return;
      list.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientWidth : 1);
      event.preventDefault();
    };
    list.addEventListener('scroll', measure, {passive: true});
    list.addEventListener('focusin', focusItem);
    list.addEventListener('pointerdown', down);
    list.addEventListener('pointermove', move);
    list.addEventListener('pointerup', up);
    list.addEventListener('pointercancel', up);
    list.addEventListener('lostpointercapture', up);
    list.addEventListener('click', click, true);
    list.addEventListener('dragstart', dragStart);
    list.addEventListener('wheel', wheel, {passive: false});
    observeItems();
    void document.fonts.ready.then(() => {if (alive) revealTail();});
    return () => {
      alive = false;
      resize.disconnect(); mutations.disconnect();
      list.removeEventListener('scroll', measure);
      list.removeEventListener('focusin', focusItem);
      list.removeEventListener('pointerdown', down);
      list.removeEventListener('pointermove', move);
      list.removeEventListener('pointerup', up);
      list.removeEventListener('pointercancel', up);
      list.removeEventListener('lostpointercapture', up);
      list.removeEventListener('click', click, true);
      list.removeEventListener('dragstart', dragStart);
      list.removeEventListener('wheel', wheel);
    };
  }, [pathname, currentLocale]);

  const scroll = (direction: number) => {
    const list = root.current?.querySelector('ul.breadcrumbs');
    if (list) list.scrollBy({left: direction * Math.max(80, list.clientWidth * 0.6), behavior: 'instant'});
  };
  return <div ref={root} className={styles.trail} data-breadcrumb-scroller>
    {children}
    <button type="button" className={`${styles.edge} ${styles.before}`} hidden={!edges.before}
      style={{left: edges.homeWidth, width: edges.beforeWidth}} data-breadcrumb-back
      aria-label={ko ? '앞쪽 경로 보기' : 'Show earlier breadcrumbs'} onClick={() => scroll(-1)}>…</button>
    <button type="button" className={`${styles.edge} ${styles.after}`} hidden={!edges.after}
      data-breadcrumb-forward aria-label={ko ? '뒤쪽 경로 보기' : 'Show later breadcrumbs'}
      onClick={() => scroll(1)}>…</button>
  </div>;
}
