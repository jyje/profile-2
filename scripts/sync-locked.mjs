import {withBuildLock} from './build-lock.mjs';
await withBuildLock(() => import('./sync-content.mjs'));
