import {withBuildLock} from './build-lock.mjs';
import {syncAll} from './sync-content.mjs';
await withBuildLock(syncAll);
console.log('[sync-content] synced');
