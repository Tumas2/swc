"use strict";

/**
 * Wires a store to localStorage so its state survives page reloads.
 *
 * Priority on page load:
 *   1. SSR state (window.__SWC_INITIAL_STATE__) — wins if present, localStorage skipped
 *   2. localStorage — restored if no SSR state was injected
 *   3. Store defaults — used if neither of the above exist
 *
 * After wiring:
 *   - Every setState() call writes the full state to localStorage.
 *   - resetState() removes the localStorage entry so defaults take over on next load.
 *
 * @param {import('./store.js').StateStore} store - The store to persist.
 * @param {string} key - The store id, used to build the localStorage key (swc:<key>).
 */
export function persistStore(store, key) {
    const storageKey = `swc:${key}`;

    const hasServerState = !!window.__SWC_INITIAL_STATE__?.[key];
    if (!hasServerState) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                store._state = { ...store._state, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn(`SWC: Failed to restore "${key}" from localStorage.`, e);
        }
    }

    const originalSetState = store.setState.bind(store);
    store.setState = function (newState) {
        originalSetState(newState);
        try {
            localStorage.setItem(storageKey, JSON.stringify(store._state));
        } catch (e) {
            console.warn(`SWC: Failed to persist "${key}" to localStorage.`, e);
        }
    };

    const originalResetState = store.resetState.bind(store);
    store.resetState = function () {
        originalResetState();
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.warn(`SWC: Failed to clear "${key}" from localStorage.`, e);
        }
    };
}
