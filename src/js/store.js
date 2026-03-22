"use strict";

/** @type {Map<string, StateStore>} */
const _registry = new Map();

/**
 * Returns the store registered under the given id, or undefined if not found.
 * Only stores created via createStore() are registered.
 * @param {string} id
 * @returns {StateStore|AttributedStateStore|undefined}
 */
export function getStore(id) {
    return _registry.get(id);
}

/**
 * Returns a read-only snapshot of all registered stores keyed by id.
 * @returns {Map<string, StateStore>}
 */
export function getAllStores() {
    return new Map(_registry);
}

export class StateStore {
    /**
     * @param {object} initialState The initial state of the store.
     */
    constructor(initialState) {
        /**
         * @private
         * @description A non-mutating copy of the original state.
         */
        this._initialState = { ...initialState } || {};

        /**
         * @private
         * @description The current state of the store.
         */
        this._state = { ...initialState } || {};

        /**
         * @private
         * @type {Set<Function>}
         */
        this._subscribers = new Set();
    }

    /**
     * Subscribes a callback function to be executed whenever the state changes.
     * @param {Function} callback - The function to call on state updates.
     */
    subscribe(callback) {
        this._subscribers.add(callback);
    }

    /**
     * Unsubscribes a callback function from state updates.
     * @param {Function} callback - The function to remove.
     */
    unsubscribe(callback) {
        this._subscribers.delete(callback);
    }

    /**
     * Returns the current state of the store.
     * @returns {object} The current state object (shallow copy).
     */
    getState() {
        return this._state;
    }

    /**
     * Updates the store's state and notifies subscribers.
     * @param {object} newState - The new state properties to merge.
     */
    setState(newState) {
        this._state = { ...this._state, ...newState };
        this._subscribers.forEach(callback => callback());
    }

    /**
     * Resets the store's state back to its original initial state.
     */
    resetState() {
        this._state = { ...this._initialState };
        // Notify subscribers that the state has changed
        this._subscribers.forEach(callback => callback());
    }
}

/**
 * Opt-in typed store. Instead of a plain state object, accepts an attributes
 * schema where each key maps to `{ type, default }`. Initial state is derived
 * from the `default` values. On every `setState()` call, each incoming value
 * is checked against its declared type — mismatches produce a console.warn
 * (never a throw) so development mistakes are visible without breaking the app.
 *
 * Supported types: "string" | "number" | "boolean" | "array" | "object"
 *
 * @extends StateStore
 */
export class AttributedStateStore extends StateStore {
    /**
     * @param {Record<string, {type: string, default: *}>} attributes
     */
    constructor(attributes) {
        const initialState = Object.fromEntries(
            Object.entries(attributes).map(([key, def]) => [key, def.default ?? null])
        );
        super(initialState);
        /** @private */
        this._attributes = attributes;
    }

    /**
     * Updates state with type validation. Logs a warning for type mismatches.
     * @param {object} newState
     */
    setState(newState) {
        for (const [key, value] of Object.entries(newState)) {
            const def = this._attributes[key];
            if (def && !this._checkType(value, def.type)) {
                console.warn(`SWC: setState() — "${key}" expected "${def.type}", got "${typeof value}"`);
            }
        }
        super.setState(newState);
    }

    /**
     * @private
     * @param {*} value
     * @param {string} type
     * @returns {boolean}
     */
    _checkType(value, type) {
        if (type === 'array')  return Array.isArray(value);
        if (type === 'object') return typeof value === 'object' && !Array.isArray(value) && value !== null;
        return typeof value === type;
    }
}

/**
 * Creates a StateStore (or AttributedStateStore) that is SSR-aware.
 *
 * Accepts a store manifest object or a plain (key, defaultState) pair.
 * When the manifest has an `attributes` key, an AttributedStateStore is
 * returned — initial state is derived from each attribute's `default` value.
 * When the manifest has a `state` key, a plain StateStore is returned.
 * When PHP has injected window.__SWC_INITIAL_STATE__, the matching key is
 * used as the starting state. resetState() always goes back to the JS defaults.
 *
 * @param {string|{id: string, state: object}|{id: string, attributes: object}} keyOrMeta
 *   Store id string, a store.json manifest with a `state` key, or a store.json
 *   manifest with an `attributes` key.
 * @param {object} [defaultState] - Default state when passing a plain key. Ignored when manifest is passed.
 * @returns {StateStore|AttributedStateStore}
 */
export function createStore(keyOrMeta, defaultState) {
    const isMeta = typeof keyOrMeta === 'object';
    const key    = isMeta ? keyOrMeta.id : keyOrMeta;

    if (_registry.has(key)) {
        console.warn(`SWC: a store with id "${key}" is already registered. Returning the existing store.`);
        return _registry.get(key);
    }

    if (isMeta && keyOrMeta.attributes) {
        const store       = new AttributedStateStore(keyOrMeta.attributes);
        const serverState = window.__SWC_INITIAL_STATE__?.[key];
        if (serverState) store._state = { ...store._state, ...serverState };
        _registry.set(key, store);
        return store;
    }

    const state       = isMeta ? (defaultState ?? keyOrMeta.state) : defaultState;
    const serverState = window.__SWC_INITIAL_STATE__?.[key];
    const store       = new StateStore(serverState ?? state);
    store._initialState = { ...state };
    _registry.set(key, store);
    return store;
}
