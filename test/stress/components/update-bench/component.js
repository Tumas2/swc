import { NanoRenderStatefulElement, StateStore } from 'swc';

/**
 * Store for the rapid-update benchmark.
 * @type {StateStore}
 */
export const updateBenchStore = new StateStore({ count: 0 });

/**
 * A single component that receives rapid successive setState calls.
 * Used to benchmark NanoRenderer re-render + dom-morph throughput.
 */
export class UpdateBench extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; text-align: center; padding: 1rem; }
            .count { font-size: 3rem; color: #4ade80; font-weight: bold; }
            .label { font-size: 0.75rem; color: #555; margin-top: 0.25rem; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { bench: updateBenchStore };
    }

    /** @returns {string} */
    view() {
        return `
            <div class="count">{{bench.count}}</div>
            <div class="label">update-bench</div>
        `;
    }
}

customElements.define('update-bench', UpdateBench);
