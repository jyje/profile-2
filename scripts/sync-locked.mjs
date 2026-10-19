import {withBuildLock} from './build-lock.mjs';
import {syncAll} from './sync-content.mjs';
import bracesMitigation from './patch-braces.cjs';
bracesMitigation.patchBraces(undefined, {check: true});
await withBuildLock(syncAll);
console.log('[sync-content] synced');
