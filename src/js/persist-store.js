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
 *   - A write from another tab is picked up and applied here, so two tabs of the
 *     same app cannot overwrite each other.
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

    // Cross-tab sync. Every write above saves the whole state, so without this a
    // second tab holding an older copy flattens the first tab's work the next
    // time it writes anything at all — it does not have to touch the same data,
    // or any data the other tab cares about.
    //
    // `storage` fires only in *other* tabs, never the one that wrote, so there is
    // no echo to guard against. Same origin and same browser profile only; this
    // is not a substitute for syncStore, which is what crosses devices.
    window.addEventListener('storage', (e) => {
        if (e.storageArea !== localStorage || e.key !== storageKey) return;

        // Applied through the unwrapped methods on purpose. That skips the write
        // back to localStorage — which would otherwise ping-pong between tabs —
        // and skips syncStore's dirty flag, since the tab that made the change is
        // already responsible for pushing it.
        try {
            if (e.newValue === null) {
                originalResetState();
            } else {
                originalSetState(JSON.parse(e.newValue));
            }
        } catch (err) {
            console.warn(`SWC: Failed to apply a cross-tab update for "${key}".`, err);
        }
    });
}
