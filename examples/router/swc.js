export { StateStore, createStore } from '../../src/js/store.js';
export { StatefulElement } from '../../src/js/StatefulElement.js';
export { NanoRenderStatefulElement, NanoRenderer } from '../../src/js/NanoRenderer.js';
export { defineComponent } from '../../src/js/index.js';

import {
    RouterContainer,
    NanoRenderRouterSwitch,
    RouterRoute,
    RouterLink,
} from '../../src/js/router/index.js';

customElements.define('router-container', RouterContainer);
customElements.define('router-switch', NanoRenderRouterSwitch);
customElements.define('router-route', RouterRoute);

// RouterLink subclass adds a default style so the inner <a> inherits page colours.
class AppRouterLink extends RouterLink {
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync('a { color: inherit; text-decoration: none; }');
        return [sheet];
    }
}
customElements.define('router-link', AppRouterLink);
