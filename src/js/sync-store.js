"use strict";

/**
 * Wires a store to a remote backend with push/pull sync.
 *
 * On page load and whenever the device comes back online, a sync cycle runs:
 *   1. push — sends current state to the backend (if the store is dirty)
 *   2. pull — fetches remote state since last sync and merges it back
 *
 * The library has no opinion on transport, backend, or conflict resolution.
 * Those concerns live entirely inside the push/pull/onBeforeSync functions
 * the caller provides.
 *
 * Stacking with persistStore:
 *   Apply persistStore first, then syncStore. That way pull results are
 *   automatically saved to localStorage by the persistStore wrapper.
 *
 *   persistStore(store, 'todos');
 *   syncStore(store, 'todos', { push, pull });
 *
 * @param {import('./store.js').StateStore} store
 * @param {string} key - Used to namespace the lastSyncTimestamp in localStorage.
 * @param {object} config
 * @param {function} [config.push] - async (state) => void. Called when dirty and online.
 * @param {function} [config.pull] - async (state, lastSyncTimestamp) => remoteData. Called on every sync.
 * @param {function} [config.onBeforeSync] - (localState, remoteData) => mergedState. Optional merge step.
 * @param {function} [config.onSyncError] - (err) => void. Called on sync failure.
 */
export function syncStore(store, key, { push, pull, onBeforeSync, onSyncError } = {}) {
    const tsKey    = `swc-sync:${key}`;
    const dirtyKey = `swc-dirty:${key}`;
    let syncing    = false;
    let _fromSync  = false;

    const getLastSyncTimestamp = () => {
        try {
            return parseInt(localStorage.getItem(tsKey) ?? '0', 10);
        } catch {
            return 0;
        }
    };

    const setLastSyncTimestamp = (ts) => {
        try {
            localStorage.setItem(tsKey, String(ts));
        } catch {}
    };

    // Persisted so offline writes survive a page/app reload — without this an
    // in-memory flag resets to false on reload and the change is never pushed.
    const getDirty = () => {
        try {
            return localStorage.getItem(dirtyKey) === '1';
        } catch {
            return false;
        }
    };

    const setDirty = (val) => {
        try {
            if (val) {
                localStorage.setItem(dirtyKey, '1');
            } else {
                localStorage.removeItem(dirtyKey);
            }
        } catch {}
    };

    let dirty = getDirty();

    let _syncTimer = null;
    const scheduleSync = () => {
        clearTimeout(_syncTimer);
        _syncTimer = setTimeout(sync, 1000);
    };

    // Intercept setState to track when the store has local changes to push.
    // _fromSync flag prevents sync-applied updates from re-marking the store dirty.
    const originalSetState = store.setState.bind(store);
    store.setState = function (newState) {
        originalSetState(newState);
        if (!_fromSync) {
            dirty = true;
            setDirty(true);
            if (navigator.onLine) {
                scheduleSync();
            }
        }
    };

    const sync = async () => {
        if (syncing) return;
        syncing = true;

        const wasDirty = dirty;
        dirty = false;

        try {
            const state = store.getState();
            const lastSyncTimestamp = getLastSyncTimestamp();

            if ((wasDirty || lastSyncTimestamp === 0) && push) {
                await push(state);
                setDirty(false);
            }

            if (pull) {
                const remoteData = await pull(state, lastSyncTimestamp);
                if (remoteData !== undefined && remoteData !== null) {
                    const merged = onBeforeSync
                        ? onBeforeSync(store.getState(), remoteData)
                        : remoteData;
                    _fromSync = true;
                    store.setState(merged);
                    _fromSync = false;
                }
            }

            setLastSyncTimestamp(Date.now());
        } catch (err) {
            dirty = dirty || wasDirty;
            if (wasDirty) {
                setDirty(true);
            }
            _fromSync = false;
            if (onSyncError) {
                onSyncError(err);
            } else {
                console.warn(`SWC: Sync failed for "${key}".`, err);
            }
        } finally {
            syncing = false;
        }
    };

    if (navigator.onLine) {
        sync();
    }

    window.addEventListener('online', sync);
}
