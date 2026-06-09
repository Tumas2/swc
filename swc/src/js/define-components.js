/**
 * @typedef {{ importFn: function(): Promise<*>, trigger: function|undefined }} PendingEntry
 * @type {Map<string, PendingEntry>}
 */
const _pending = new Map();

// Listen for router-switch renders — scan the shadow root for pending components.
document.addEventListener('swc:render', (event) => {
    const root = event.detail?.root;
    if (!root || _pending.size === 0) return;
    for (const [name, { importFn, trigger }] of _pending) {
        const elements = [...root.querySelectorAll(name)];
        if (elements.length > 0) {
            _activate(name, importFn, trigger, elements);
        }
    }
});

/**
 * Registers custom elements with optional lazy loading.
 *
 * Each value is a dynamic import function: `() => import('./component.js')`.
 * Eager components have their import called immediately. Lazy components wait
 * until their element appears in the DOM (light or shadow via the router).
 *
 * @param {Record<string, function(): Promise<*>>} definitions
 *   Map of custom element tag names to dynamic import functions.
 * @param {object} [options]
 * @param {boolean} [options.lazy=false]
 *   Sets the default loading mode. `true` = defer all; `false` = eager all.
 * @param {string[]} [options.except=[]]
 *   Exception list — these get the *opposite* of `lazy`.
 *   `lazy:true  + except:['x']` → x loads eagerly, rest defer.
 *   `lazy:false + except:['x']` → x defers, rest load eagerly.
 * @param {function({ name: string, elements: Element[], load: function }): void} [options.trigger]
 *   Custom function that controls *when* a lazy component loads.
 *   Called each time a lazy component's elements are found in the DOM.
 *   Must call `load()` when ready. `load()` is idempotent.
 *   When omitted, lazy components load immediately upon element discovery.
 */
export function defineComponents(definitions, { lazy = false, except = [], trigger } = {}) {
    for (const [name, importFn] of Object.entries(definitions)) {
        const isLazy = lazy ? !except.includes(name) : except.includes(name);
        if (isLazy) {
            _observeAndLoad(name, importFn, trigger);
        } else {
            importFn();
        }
    }
}

/**
 * Returns a trigger that loads a component when it first enters the viewport.
 *
 * @param {object} [options]
 * @param {string} [options.rootMargin='0px'] Margin around the viewport for early loading.
 * @param {number} [options.threshold=0] Intersection ratio needed to trigger load.
 * @returns {function({ elements: Element[], load: function }): void}
 */
export function whenVisible({ rootMargin = '0px', threshold = 0 } = {}) {
    return ({ elements, load }) => {
        const io = new IntersectionObserver((entries) => {
            if (entries.some(e => e.isIntersecting)) {
                load();
                io.disconnect();
            }
        }, { rootMargin, threshold });
        elements.forEach(el => io.observe(el));
    };
}

/**
 * Returns a trigger that loads a component during browser idle time.
 *
 * @param {object} [options]
 * @param {number} [options.timeout=2000] Max ms to wait before forcing load if idle never fires.
 * @returns {function({ load: function }): void}
 */
export function whenIdle({ timeout = 2000 } = {}) {
    return ({ load }) => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => load(), { timeout });
        } else {
            setTimeout(load, 0);
        }
    };
}

/**
 * Removes a component from the pending map and calls its import function.
 *
 * @param {string} name
 * @param {function(): Promise<*>} importFn
 */
function _load(name, importFn) {
    _pending.delete(name);
    importFn();
}

/**
 * Calls the trigger (or loads immediately) for a component whose elements were found.
 *
 * @param {string} name
 * @param {function(): Promise<*>} importFn
 * @param {function|undefined} trigger
 * @param {Element[]} elements
 */
function _activate(name, importFn, trigger, elements) {
    if (!_pending.has(name)) return;
    let done = false;
    const load = () => {
        if (done) return;
        done = true;
        _load(name, importFn);
    };
    trigger ? trigger({ name, elements, load }) : load();
}

/**
 * Sets up DOM observation for a lazy component. Fires `_activate` when elements
 * matching `name` are found in the light DOM. Also responds to `swc:render` events
 * from the router for shadow DOM discovery.
 *
 * @param {string} name
 * @param {function(): Promise<*>} importFn
 * @param {function|undefined} trigger
 */
function _observeAndLoad(name, importFn, trigger) {
    _pending.set(name, { importFn, trigger });

    const start = () => {
        if (!_pending.has(name)) return;
        const elements = [...document.querySelectorAll(name)];
        if (elements.length > 0) {
            _activate(name, importFn, trigger, elements);
            return;
        }
        const observer = new MutationObserver(() => {
            if (!_pending.has(name)) { observer.disconnect(); return; }
            const found = [...document.querySelectorAll(name)];
            if (found.length > 0) {
                _activate(name, importFn, trigger, found);
                observer.disconnect();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}
