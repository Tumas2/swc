import { NanoRenderStatefulElement, StateStore } from 'swc';

/**
 * Store holding the list data for the list-render benchmark.
 * @type {StateStore}
 */
export const listBenchStore = new StateStore({ items: [] });

/**
 * Renders a large list of items via NanoRenderer's {{#each}} loop.
 * Used to benchmark template compile + render + morph time at scale.
 */
export class ListBench extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: block; }
            .list-item {
                display: grid;
                grid-template-columns: 3rem 1fr 6rem 4rem;
                gap: 0.5rem;
                padding: 2px 4px;
                font-size: 0.7rem;
                border-bottom: 1px solid #1a1a1a;
                color: #888;
            }
            .empty { color: #444; font-size: 0.75rem; padding: 0.5rem; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { bench: listBenchStore };
    }

    /** @returns {string} */
    view() {
        return `
            {{#each bench.items}}
                <div class="list-item">
                    <span>{{this.id}}</span>
                    <span>{{this.name}}</span>
                    <span>{{this.value}}</span>
                    <span>{{this.tag}}</span>
                </div>
            {{else}}
                <div class="empty">No items loaded.</div>
            {{/each}}
        `;
    }
}

customElements.define('list-bench', ListBench);
