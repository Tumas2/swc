import { NanoRenderStatefulElement, StateStore } from 'swc';

/**
 * Shared store used by all bench-item instances.
 * Allows the store-broadcast test to trigger simultaneous re-renders.
 * @type {StateStore}
 */
export const benchItemStore = new StateStore({ count: 0, label: 'item' });

/**
 * A minimal stateful component used as the building block across all stress tests.
 * Supports slotting so instances can be nested inside each other for depth tests.
 */
export class BenchItem extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; }
            .item { padding: 1px 4px; font-size: 0.7rem; color: #666; border-left: 2px solid #222; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { bench: benchItemStore };
    }

    /** @returns {string} */
    view() {
        return `<div class="item">{{bench.label}} #{{bench.count}}<slot></slot></div>`;
    }

    onMount() {
        performance.mark('bench-item-mounted');
    }
}

customElements.define('bench-item', BenchItem);
