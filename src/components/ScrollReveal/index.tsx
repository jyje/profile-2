import {useEffect} from 'react';
import styles from './styles.module.css';

const targetSelector = [
  '.theme-doc-markdown > *',
  '#__blog-post-container > *',
  'main article > header',
  'main > header',
  'main > section',
  'main article:not(.theme-doc-markdown)',
  '.about-hero',
  '.about-section',
  '.site-labs-page main article > div',
].join(', ');

type Props = {
  pathname: string;
};

export default function ScrollReveal({pathname}: Props) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;

    const contentRoot = document.getElementById('__docusaurus') ?? document.body;
    const observed = new Set<HTMLElement>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const element = entry.target as HTMLElement;
        element.classList.add(styles.visible);
        element.style.removeProperty('--scroll-reveal-delay');
        observer.unobserve(element);
      }
    }, {
      rootMargin: '0px 0px -56px 0px',
      threshold: 0.04,
    });

    let sequence = 0;
    const registerTargets = () => {
      for (const element of contentRoot.querySelectorAll<HTMLElement>(targetSelector)) {
        if (observed.has(element)) continue;

        // Prefer the smallest matching content blocks. This lets About sections
        // and cards reveal individually instead of hiding their whole wrapper.
        if (element.querySelector(targetSelector)) {
          continue;
        }

        let parent = element.parentElement;
        let hasObservedAncestor = false;
        while (parent) {
          if (observed.has(parent)) {
            hasObservedAncestor = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (hasObservedAncestor) continue;

        observed.add(element);
        element.classList.add(styles.reveal);
        element.style.setProperty('--scroll-reveal-delay', `${(sequence % 3) * 65}ms`);
        sequence += 1;
        observer.observe(element);
      }
    };

    registerTargets();
    const mutations = new MutationObserver(registerTargets);
    mutations.observe(contentRoot, {childList: true, subtree: true});

    return () => {
      mutations.disconnect();
      observer.disconnect();
      for (const element of observed) {
        element.classList.remove(styles.reveal, styles.visible);
        element.style.removeProperty('--scroll-reveal-delay');
      }
    };
  }, [pathname]);

  return null;
}
