import React, {useEffect, useRef, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useColorMode} from '@docusaurus/theme-common';
import {Button} from '@site/src/components/ui/button';
import styles from './styles.module.css';

type Options = {locale: 'ko' | 'en'; theme: 'light' | 'dark'};
type Handle = {update(options: Options): void; unmount(): void};
type Remote = {contractVersion: number; mount(container: HTMLElement, options: Options): Handle};
type Copy = {loading: string; unavailable: string; explanation: string; retry: string; missing: string; connected: string};
let attemptSequence = 0;
const recoveredEntries = new Map<string, string>();

export default function FederatedLabs({copy}: {copy: Copy}) {
  const {siteConfig, i18n} = useDocusaurusContext();
  const {colorMode} = useColorMode();
  const container = useRef<HTMLDivElement>(null);
  const handle = useRef<Handle | null>(null);
  const options = useRef<Options>({locale: i18n.currentLocale === 'en' ? 'en' : 'ko', theme: colorMode});
  options.current = {locale: i18n.currentLocale === 'en' ? 'en' : 'ko', theme: colorMode};
  const entryConfig = String(siteConfig.customFields?.labsRemoteEntry ?? '');
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!entryConfig) {setState('missing'); return;}
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;
    let mounted: Handle | undefined;
    setState('loading');
    // Follow the browser hostname, including when browsing from another LAN device.
    const entry = entryConfig === 'local'
      ? `${window.location.protocol}//${window.location.hostname}:5174/remoteEntry.js`
      : entryConfig;
    async function load() {
      try {
        const url = new URL(recoveredEntries.get(entry) ?? entry, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported remote protocol');
        // Browsers cache failed ESM imports by URL. A new instance alone cannot
        // recover a remote entry that previously returned 404.
        if (attempt > 0) url.searchParams.set('labs_retry', `${Date.now()}-${attempt}`);
        const pending = (async () => {
          const {createInstance} = await import('@module-federation/enhanced/runtime');
          const federation = createInstance({
            name: `profile_labs_${++attemptSequence}`,
            remotes: [{name: 'jyje_labs', entry: url.href, type: 'module'}],
          });
          return federation.loadRemote<Remote>('jyje_labs/app');
        })();
        const remote = await Promise.race([
          pending,
          new Promise<never>((_, reject) => {timeout = setTimeout(() => reject(new Error('Remote timeout')), 12000);}),
        ]);
        clearTimeout(timeout);
        if (stopped) return;
        if (!remote || remote.contractVersion !== 1 || typeof remote.mount !== 'function') throw new Error('Incompatible Labs contract');
        if (!container.current) return;
        mounted = remote.mount(container.current, options.current);
        recoveredEntries.set(entry, url.href);
        handle.current = mounted;
        setState('ready');
      } catch {
        clearTimeout(timeout);
        if (!stopped) setState('error');
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timeout);
      mounted?.unmount();
      if (handle.current === mounted) handle.current = null;
    };
  }, [entryConfig, attempt]);

  useEffect(() => {handle.current?.update(options.current);}, [i18n.currentLocale, colorMode]);

  return <div className={styles.frame}>
    {state === 'loading' && <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p>{copy.loading}</p>
    </div>}
    {(state === 'error' || state === 'missing') && <div className={styles.placeholder} role="alert">
      <h2>{copy.unavailable}</h2><p>{state === 'missing' ? copy.missing : copy.explanation}</p>
      {state === 'error' && <Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</Button>}
    </div>}
    {state === 'ready' && <p className={styles.connection} role="status">{copy.connected}</p>}
    <div ref={container} hidden={state !== 'ready'} />
  </div>;
}
