export { StateStore } from '../../src/js/store.js';
export { loadHTML } from '../../src/js/html-loader.js';
export { StatefulElement } from '../../src/js/StatefulElement.js';
export { NanoRenderStatefulElement } from '../../src/js/NanoRenderer.js';

import { NanoRenderer } from '../../src/js/NanoRenderer.js';
import {
    RouterContainer,
    RouterSwitch,
    RouterRoute,
    RouterLink,
} from '../../src/js/router/index.js';

const renderer = new NanoRenderer();

export class NanoRenderRouterContainer extends RouterContainer {
    getRenderer = () => renderer.render
}

export class NanoRenderRouterSwitch extends RouterSwitch {
    getRenderer = () => renderer.render
}

export class NanoRenderRouterLink extends RouterLink {
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.insertRule("a { color: inherit; text-decoration: none; }");
        return [sheet];
    }
    getRenderer = () => renderer.render
}

customElements.define('router-container', NanoRenderRouterContainer);
customElements.define('router-switch', NanoRenderRouterSwitch);
customElements.define('router-link', NanoRenderRouterLink);
