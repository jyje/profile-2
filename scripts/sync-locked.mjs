import {withBuildLock} from './build-lock.mjs';
import {syncAll} from './sync-content.mjs';
import dependencyPatches from './verify-dependency-patches.cjs';
dependencyPatches.verifyDependencyPatches();
await withBuildLock(syncAll);
console.log('[sync-content] synced');
