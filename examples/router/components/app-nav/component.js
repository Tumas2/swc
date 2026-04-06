import { StatefulElement } from '../../swc.js';


import localStyles from './style.css' with { type: 'css' };

/**
 * Top navigation bar with router-link items.
 * Active link styling is handled via CSS ::part(link--active).
 */
export class AppNav extends StatefulElement {

    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    getStyles() {
        return [localStyles];
    }
}

customElements.define('app-nav', AppNav);
