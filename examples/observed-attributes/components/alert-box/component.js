import { NanoRenderStatefulElement } from '../../swc.js';
import meta from './manifest.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * An alert box whose appearance is driven entirely by a `type` HTML attribute.
 * Demonstrates: static observedAttributes, attributeChangedCallback auto-wired
 * by SWC to trigger render(), and computed() reading from getAttribute().
 */
export class AlertBox extends NanoRenderStatefulElement {

    static observedAttributes = ['type'];

    /** @returns {CSSStyleSheet[]} */
    getStyles() { return [styles]; }

    /** @returns {string} */
    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * Derives template variables from the current attribute value.
     * No store is needed — the attribute is the only data source.
     * @param {object} _state
     * @returns {object}
     */
    computed(_state) {
        const type = this.getAttribute('type') || 'info';
        return {
            type,
            isInfo:    type === 'info',
            isSuccess: type === 'success',
            isWarning: type === 'warning',
            isError:   type === 'error',
        };
    }
}

customElements.define(meta.name, AlertBox);
