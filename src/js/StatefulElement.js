import { loadHTML } from './html-loader.js';
import { morph } from './dom-morph.js';
import { getStore } from './store.js';

/**
 * A state-driven base class for creating powerful, reactive Web Components.
 * It provides state management, optional Handlebars.js templating,
 * Declarative Shadow DOM hydration, and automatic focus management.
 * @class StatefulElement
 * @extends {HTMLElement}
 */
export class StatefulElement extends HTMLElement {

    /**
     * Creates an instance of StatefulElement.
     */
    constructor() {
        super();

        if (!this.shadowRoot) {
            this.attachShadow({ mode: 'open' });
        }

        this.shadowRoot.adoptedStyleSheets = this.getStyles();
        this.state = {};
        this.template = null;
        this._stores = null;
        this._eventListeners = [];
        this._renderCallback = this.render.bind(this);
    }

    /**
     * Lifecycle method called when the component is added to the DOM.
     * @returns {Promise<void>}
     */
    async connectedCallback() {
        let clientTemplateFound = false;

        const templatePath = this.getTemplatePath();
        if (templatePath) {
            this.template = await loadHTML(templatePath);
            clientTemplateFound = true;
        }

        if (!clientTemplateFound) {
            const viewHtml = this.view();
            if (viewHtml) {
                this.template = viewHtml;
                clientTemplateFound = true;
            }
        }

        if (!clientTemplateFound && this.shadowRoot && !this.template) {
            this.template = this.shadowRoot.innerHTML;
        }

        this._stores = this._resolveStores();
        if (typeof this._stores !== 'object' || this._stores === null) {
            throw new Error('getStores() must be implemented and return an object of store instances.');
        }

        for (const key in this._stores) {
            this._stores[key].subscribe(this._renderCallback);
        }

        this.render();
        this.onMount();
    }

    /**
     * Lifecycle method called when the component is removed from the DOM.
     */
    disconnectedCallback() {
        this._removeEventListeners();
        if (this._stores) {
            for (const key in this._stores) {
                this._stores[key].unsubscribe(this._renderCallback);
            }
        }
        this.onUnmount();
    }

    /**
     * The main render method. Passes template and data to the chosen renderer.
     */
    render() {
        this._syncState();

        const computedData = this.computed(this.state);

        const context = { ...this.state, ...computedData };
        const renderer = this.getRenderer();
        const templateString = this.template || this.view() || '';
        const finalHtml = renderer(templateString, context);
        this.html([finalHtml]);
    }

    // --- Abstract Methods (to be implemented by subclasses) ---

    /**
     * @abstract
     * Subclasses can implement this to provide a map of store instances.
     * Used as a fallback when getManifest() returns no stores.
     * @returns {Object.<string, {subscribe: Function, getState: Function, setState: Function}>}
     */
    getStores() {
        return {};
    }

    /**
     * @abstract
     * Override to provide the component's JSON manifest for auto-wiring stores.
     * When the manifest has a `stores` array, those stores are resolved from the
     * registry automatically and take precedence over getStores().
     * @returns {object|null}
     */
    getManifest() {
        return null;
    }

    /**
     * @abstract
     * Subclasses can implement this to provide a path to an external HTML template file.
     * @returns {string | null}
     */
    getTemplatePath() {
        return null;
    }

    /**
     * @abstract
     * Subclasses can implement this to provide an array of imported CSSStyleSheet objects.
     * @returns {CSSStyleSheet[]}
     */
    getStyles() {
        return [];
    }

    /**
     * @abstract
     * Subclasses can implement this to provide an inline template string.
     * @returns {string}
     */
    view() {
        return '';
    }

    /**
     * @abstract
     * Override to calculate values derived from state for the template.
     * Runs on every render.
     * @returns {object}
     */
    computed(state) {
        return {};
    }

    /**
     * Subclasses can override this method to provide a different rendering engine.
     * If not overridden, it defaults to a "raw" renderer that does no interpolation.
     * @returns {(template: string, data: object) => string} A function for rendering templates.
     * @example
     * // To use your NanoRenderer:
     * import { NanoRenderer } from './NanoRenderer.js';
     * const nano = new NanoRenderer();
     * * getRenderer() {
     * return nano.render;
     * }
     */
    getRenderer() {
        return this._rawRenderer;
    }

    /**
     * @abstract
     * A lifecycle hook called after the component is first connected and rendered.
     */
    onMount() {
        // This method is intended to be overridden by subclasses.
    }

    /**
     * @abstract
     * A lifecycle hook called when the component is removed from the DOM.
     */
    onUnmount() {
        // This method is intended to be overridden by subclasses.
    }

    // --- Internal Helper Methods ---

    /**
     * @private
     * Resolves store instances from getManifest() or falls back to getStores().
     * Manifest stores take precedence — they keep JS and PHP SSR in sync.
     * Warns if both sources define stores so the developer can remove the redundancy.
     * @returns {object}
     */
    _resolveStores() {
        const manual = this.getStores();
        const manifest = this.getManifest();
        const manifestStores = manifest?.stores ?? [];

        const hasManual = Object.keys(manual).length > 0;
        const hasManifest = manifestStores.length > 0;

        if (hasManual && hasManifest) {
            console.warn(`SWC: <${this.tagName.toLowerCase()}> defines stores in both getManifest() and getStores(). Remove one to avoid duplicate subscriptions. Using getManifest().`);
        }

        if (hasManifest) {
            const stores = {};
            for (const id of manifestStores) {
                const store = getStore(id);
                if (!store) {
                    console.warn(`SWC: <${this.tagName.toLowerCase()}> — auto-wiring failed for "${id}". Make sure createStore("${id}") is called before this component connects.`);
                    continue;
                }
                stores[id] = store;
            }
            return stores;
        }

        if (hasManual) return manual;

        return {};
    }

    /**
     * @private
     * The default "raw" renderer. It does no processing and just returns the template string.
     * @param {string} template - The template string.
     * @returns {string} The original template string.
     */
    _rawRenderer(template) {
        return template || '';
    }

    /**
     * @private
     * Renders an HTML string, wires up event listeners, and manages focus.
     * @param {string[]} strings - The string parts of a template literal.
     * @param {...any} values - The interpolated values.
     */
    html(strings, ...values) {
        let activeElementId = null;
        let activeElementPath = null;
        let selectionStart, selectionEnd;
        const activeEl = this.shadowRoot.activeElement;

        // Capture focus state.
        // Morphing generally preserves focus, but explicit handling ensures reliability
        // during complex DOM updates involving node replacement.
        if (activeEl) {
            if (activeEl.id) {
                activeElementId = activeEl.id;
            } else {
                activeElementPath = this._getElementPath(activeEl);
            }
            selectionStart = activeEl.selectionStart;
            selectionEnd = activeEl.selectionEnd;
        }

        this._removeEventListeners();

        // Construct the new HTML string
        let fullHtml;
        if (Array.isArray(strings)) {
            fullHtml = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
        } else {
            // Handle case where strings is just a string (passed from render())
            fullHtml = strings;
        }

        // Create a temporary template to hold the new DOM structure
        const tempTemplate = document.createElement('template');
        tempTemplate.innerHTML = fullHtml;

        // Preprocess template: convert on* attributes to stable data-swc-event-* attributes
        // This prevents the "flash" in inspectors because we don't add/remove attributes constantly.
        const walker = document.createTreeWalker(tempTemplate.content, NodeFilter.SHOW_ELEMENT);
        let currentNode = walker.nextNode();
        while (currentNode) {
            const attrs = Array.from(currentNode.attributes);
            for (const attr of attrs) {
                if (attr.name.startsWith('on')) {
                    const eventName = attr.name.substring(2);
                    currentNode.setAttribute(`data-swc-event-${eventName}`, attr.value);
                    currentNode.removeAttribute(attr.name);
                }
            }
            currentNode = walker.nextNode();
        }

        // Morph the shadowRoot to match the new structure
        morph(this.shadowRoot, tempTemplate.content);

        // Re-attach event listeners based on the stable data attributes
        this.shadowRoot.querySelectorAll('*').forEach(element => {
            for (const attr of element.attributes) {
                if (attr.name.startsWith('data-swc-event-')) {
                    const eventName = attr.name.substring(15); // 'data-swc-event-'.length
                    const handlerName = attr.value;
                    if (typeof this[handlerName] === 'function') {
                        const handler = this[handlerName].bind(this);
                        // We do not remove the data-swc-event-* attribute here. It stays stable to prevent inspector flashing.
                        // The event listener is attached, effectively "consuming" the intention of the attribute without modifying the DOM structure.
                        element.addEventListener(eventName, handler);
                        this._eventListeners.push({ element, eventName, handler });
                    } else {
                        console.warn(`Method "${handlerName}" not found on component <${this.tagName.toLowerCase()}>.`);
                    }
                }
            }
        });

        // Restore focus if lost (morphing usually keeps it, but if nodes were replaced it might be lost)
        let newActiveElement = null;
        if (activeElementId) {
            newActiveElement = this.shadowRoot.querySelector(`#${activeElementId}`);
        } else if (activeElementPath) {
            newActiveElement = this._getElementByPath(activeElementPath);
        }

        if (newActiveElement && document.activeElement !== newActiveElement && newActiveElement !== this.shadowRoot.activeElement) {
            newActiveElement.focus();
            if (typeof selectionStart === 'number' && typeof newActiveElement.setSelectionRange === 'function') {
                newActiveElement.setSelectionRange(selectionStart, selectionEnd);
            }
        }
    }

    /**
     * @private
     * Syncs the component's `this.state` property with the latest state from all stores.
     */
    _syncState() {
        if (!this._stores) return;
        for (const key in this._stores) {
            this.state[key] = this._stores[key].getState();
        }
    }

    /**
     * @private
     * Removes all tracked event listeners to prevent memory leaks.
     */
    _removeEventListeners() {
        this._eventListeners.forEach(({ element, eventName, handler }) => {
            element.removeEventListener(eventName, handler);
        });
        this._eventListeners = [];
    }

    /**
     * @private
     * Calculates a positional path to an element within the shadow DOM.
     * @param {HTMLElement} element The element to find the path for.
     * @returns {number[]} An array of indices representing the path.
     */
    _getElementPath(element) {
        const path = [];
        let current = element;
        while (current && current.parentNode !== this.shadowRoot) {
            const parent = current.parentNode;
            if (!parent || !parent.children) return path;
            const index = Array.from(parent.children).indexOf(current);
            path.unshift(index);
            current = parent;
        }
        if (current) {
            const index = Array.from(this.shadowRoot.children).indexOf(current);
            path.unshift(index);
        }
        return path;
    }

    /**
     * @private
     * Finds an element within the shadow DOM using a positional path.
     * @param {number[]} path An array of indices.
     * @returns {Element | null} The found element or null.
     */
    _getElementByPath(path) {
        let element = this.shadowRoot;
        for (const index of path) {
            if (!element || !element.children || !element.children[index]) {
                return null;
            }
            element = element.children[index];
        }
        return element;
    }

    /**
     * @protected
     * Recursively traverses up the DOM, crossing shadow boundaries,
     * to find the first ancestor that satisfies a predicate function.
     * @param {(el: HTMLElement) => boolean} predicate A function that returns true for the element we're looking for.
     * @param {HTMLElement} [element=this] The element to start the search from. Defaults to `this`.
     * @returns {HTMLElement | null} The matching element, or null.
     */
    _findClosestElement(predicate, element = this) {
        if (!element) {
            return null;
        }

        // 1. Check if the element itself matches the condition
        if (predicate(element)) {
            return element;
        }

        // 2. Check the host of the shadow root, if we're in one
        const rootNode = element.getRootNode();
        if (rootNode instanceof ShadowRoot) {
            const host = rootNode.host;
            if (host) {
                // Recursively start the search from the host
                return this._findClosestElement(predicate, host);
            }
        }

        // 3. If in light DOM, go up to the parent element
        if (element.parentElement) {
            return this._findClosestElement(predicate, element.parentElement);
        }

        // 4. We've reached the top of the document without finding a provider
        return null;
    }

    /**
     * @protected
     * A specific helper that uses _findClosestElement to find a store provider.
     * @returns {HTMLElement | null} The component with the store, or null.
     */
    _findStoreProvider() {
        return this._findClosestElement((el) => !!el.store);
    }
}
