import { StatefulElement } from '../../StatefulElement.js';
import { RouterStore } from '../store.js';

/**
 * Provides a RouterStore instance to all descendant router components.
 * Creates a default store, or one can be injected.
 * @example
 * <router-container base-path="/my-app/">
 * <!-- all other router components -->
 * </router-container>
 */
export class RouterContainer extends StatefulElement {
    constructor() {
        super();
        this.style.display = 'block';

        /**
         * The RouterStore instance for this router.
         * @type {RouterStore}
         */
        this.store = null;
    }

    connectedCallback() {
        // If a store hasn't been manually injected, create one.
        if (!this.store) {
            const basePath = this.getAttribute('base-path') || '/';
            this.store = new RouterStore(basePath);
        }
        super.connectedCallback();
    }

    // This component just renders its children
    view() { return `<slot></slot>`; }
}
