import { StatefulElement } from '../../StatefulElement.js';

export class RouterLink extends StatefulElement {
    constructor() {
        super();
        /** @type {import('./router-store.js').RouterStore} */
        this.store = null;
        this.addEventListener('click', this.onClick);
    }

    connectedCallback() {
        // 1. Try to find a container in the light DOM or up the shadow tree
        let provider = this._findStoreProvider();

        // 2. If not found via the standard walker, check the immediate root host 
        // (Just in case _findStoreProvider didn't catch a specific case, though it should. 
        //  We keep this fallback but safe with 'let' just to be sure to match original intent 
        //  while fixing the crash).
        if (!provider) {
            const rootNode = this.getRootNode();
            if (rootNode.host) {
                // The host will be the <router-switch> that rendered us.
                provider = rootNode.host;
            }
        }

        // 3. Check the provider for the store.
        if (!provider || !provider.store) {
            throw new Error('<router-link> must be placed inside a <router-container> or <router-switch>.');
        }

        this.store = provider.store;
        super.connectedCallback();
    }

    getStores() {
        return { router: this.store };
    }

    render() {
        this._syncState();
        this.html([this.view()]);
    }

    onClick(event) {
        event.preventDefault();
        const to = this.getAttribute('to');
        if (to && this.store) {
            this.store.navigate(to);
        }
    }

    view() {
        let classNames = this.getAttribute('class')
        classNames = classNames ? `class="${classNames}" ` : '';
        const to = this.getAttribute('to') || '#';
        const basePath = this.store ? this.store.basePath : '/';
        const fullHref = (basePath + to).replace(/\/\//g, '/');
        const currentPath = this.state.router?.pathname;
        const isActive = currentPath !== undefined && !!this.store?._matchPath(to, currentPath);
        const ariaCurrent = isActive ? ' aria-current="page"' : '';
        const part = isActive ? 'part="link link--active"' : 'part="link"';
        return `<a ${classNames}${part}${ariaCurrent} href="${fullHref}"><slot></slot></a>`;
    }
}