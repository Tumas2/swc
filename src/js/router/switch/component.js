import { StatefulElement } from '../../StatefulElement.js';
import { loadHTML } from '../../html-loader.js';
import { _sharedNano } from '../../NanoRenderer.js';

export class RouterSwitch extends StatefulElement {
    constructor() {
        super();
        this.style.display = 'block';
        /** @type {import('./router-store.js').RouterStore} */
        this.store = null;
    }

    connectedCallback() {
        // 1. Use the robust _findStoreProvider from StatefulElement to find the store
        // This handles Light DOM and Shadow DOM boundaries automatically.
        const provider = this._findStoreProvider();

        // (Removed manual specific logic which was less robust than _findStoreProvider)

        // 3. Check the provider for the store.
        if (!provider || !provider.store) {
            throw new Error('<router-switch> must be placed inside a <router-container> or another <router-switch>.');
        }
        this.store = provider.store;

        // Register all child route paths with the central store
        const routes = Array.from(this.children)
            .filter(child => child.tagName === 'ROUTER-ROUTE')
            .map(child => child.getAttribute('path'));
        this.store.registerRoutes(routes);

        super.connectedCallback();
    }

    getStores() {
        // Provide the discovered store to the base class
        return { router: this.store };
    }

    async render() {
        this._syncState();
        const currentPath = this.state.router?.pathname;

        if (currentPath === undefined || currentPath === null) {
            this.html(['']);
            return;
        }

        let routeToRender = null;
        let catchAllRoute = null;

        // Find the first matching route
        for (const child of this.children) {
            if (child.tagName !== 'ROUTER-ROUTE') continue;

            const routePath = child.getAttribute('path');
            if (routePath === '*') {
                catchAllRoute = child;
                continue;
            }

            // Use the store's own matching logic
            if (this.store._matchPath(routePath, currentPath)) {
                routeToRender = child;
                break; // Found the first match
            }
        }

        if (!routeToRender && catchAllRoute) {
            routeToRender = catchAllRoute;
        }

        let finalHtml = '';
        if (routeToRender) {
            const src = routeToRender.getAttribute('src');
            const noCache = routeToRender.hasAttribute('no-cache');
            if (src) {
                finalHtml = await loadHTML(src, !noCache);
            } else {
                finalHtml = routeToRender.innerHTML;
            }
        }

        if (this.state.router?.loading && !finalHtml) {
            // Do nothing if page is loading and we have no finalHtml yet.
        } else {
            // Guard: only set loading: false when it is currently true, otherwise
            // setState() would notify subscribers and re-trigger this render infinitely.
            if (this.state.router?.loading) {
                this.store.setState({ loading: false });
            }
            const renderer = this.getRenderer();
            const context = { ...this.computed(), ...this.state };
            this.html([renderer(finalHtml, context)]);
        }

    }
}

/**
 * RouterSwitch with NanoRenderer as the default renderer.
 * Use this when you want {{ mustache }} expressions in src= page files
 * (e.g. {{ router.params.id }}, {{ router.pathname }}).
 * Override getRenderer() to swap in a different renderer (e.g. Handlebars).
 * @extends RouterSwitch
 */
export class NanoRenderRouterSwitch extends RouterSwitch {
    /** @returns {function(string, object): string} */
    getRenderer() {
        return _sharedNano.render.bind(_sharedNano);
    }
}
