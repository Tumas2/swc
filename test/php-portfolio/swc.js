export { StateStore } from '../../src/js/store.js';
export { loadHTML } from '../../src/js/html-loader.js';
export { StatefulElement } from '../../src/js/StatefulElement.js'
export { NanoRenderStatefulElement } from '../../src/js/NanoRenderer.js'

import { StatefulElement } from '../../src/js/StatefulElement.js';
import { NanoRenderer } from '../../src/js/NanoRenderer.js'

import {
    RouterContainer,
    RouterSwitch,
    RouterRoute,
    RouterLink,
} from '../../src/js/router/index.js';

import globalStyles from './output.css' with { type: 'css' };

const renderer = new NanoRenderer();

export class CustomStatefulElement extends StatefulElement {
    getRenderer() { return renderer.render }
    getStyles() { return [globalStyles] }
}

export class NanoRenderRouterContainer extends RouterContainer {
    getRenderer() { return renderer.render }
    getStyles() { return [globalStyles] }
}

export class NanoRenderRouterSwitch extends RouterSwitch {
    getRenderer() { return renderer.render }
    getStyles() { return [globalStyles] }
}

// export class NanoRenderRouterRoute extends RouterRoute {
//     getRenderer() { return renderer.render }
//     getStyles() { return [globalStyles] }
// }

export class NanoRenderRouterLink extends RouterLink {
    getRenderer() { return renderer.render }
    getStyles() { return [globalStyles] }
}

customElements.define('router-container', NanoRenderRouterContainer);
customElements.define('router-switch', NanoRenderRouterSwitch);
// customElements.define('router-route', NanoRenderRouterRoute);
customElements.define('router-link', NanoRenderRouterLink);