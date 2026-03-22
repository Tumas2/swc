import { NanoRenderStatefulElement } from 'swc';
import { workStore } from '../stores.js';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

/**
 * Work history list grouped by company.
 * Demonstrates: nested {{#each}} (companies → roles), {{this.prop}} in nested loops,
 * getStores(), onMount() lifecycle hook, split-file pattern.
 */
export class WorkHistory extends NanoRenderStatefulElement {

    /** @returns {string} */
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        return [localStyles];
    }

    /** @returns {Object} */
    getStores() {
        return { workStore };
    }

    /** Logs mount — demonstrates onMount() lifecycle hook. */
    onMount() {
        console.log('[work-history] mounted with', this.state.workStore.companies.length, 'companies');
    }
}

customElements.define(meta.name, WorkHistory);
