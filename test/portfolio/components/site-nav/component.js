import { NanoRenderStatefulElement } from 'swc';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

/**
 * Top navigation bar showing the site logo.
 * Demonstrates: static NanoRenderStatefulElement with no stores, split-file pattern.
 */
export class SiteNav extends NanoRenderStatefulElement {

    /** @returns {string} */
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        return [localStyles];
    }
}

customElements.define(meta.name, SiteNav);
