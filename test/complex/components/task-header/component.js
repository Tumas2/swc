import { NanoRenderStatefulElement } from 'swc';
import { taskStore, uiStore } from '../stores.js';

/**
 * App title bar with filter controls and sidebar toggle.
 * Demonstrates: multiple stores, onclick, onchange, {{#if}} inline conditional.
 */
export class TaskHeader extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                display: block;
                padding: 0.6rem 1rem;
                background: #161616;
                border-bottom: 1px solid #1e1e1e;
            }

            .header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

            h1 { font-size: 0.85rem; color: #e5e5e5; letter-spacing: 0.05em; flex: 1; margin: 0; }

            .filter-label { font-size: 0.7rem; color: #444; }

            .filter-btns { display: flex; gap: 0.25rem; }

            .btn-filter {
                padding: 0.25rem 0.6rem;
                background: #1a1a1a;
                border: 1px solid #2a2a2a;
                color: #555;
                font-family: monospace;
                font-size: 0.72rem;
                cursor: pointer;
            }
            .btn-filter.active { border-color: #4ade80; color: #4ade80; background: #0a1a0a; }
            .btn-filter:hover:not(.active) { background: #222; color: #888; }

            .btn-sidebar {
                padding: 0.25rem 0.6rem;
                background: #1a1a1a;
                border: 1px solid #2a2a2a;
                color: #555;
                font-family: monospace;
                font-size: 0.72rem;
                cursor: pointer;
                white-space: nowrap;
            }
            .btn-sidebar:hover { background: #222; color: #888; }
        `);
        return [sheet];
    }

    /** @returns {Object} */
    getStores() {
        return { taskStore, uiStore };
    }

    /**
     * Derives active-state flags for each filter button.
     * @param {Object} state
     * @returns {Object}
     */
    computed(state) {
        const f = state.taskStore.filter;
        return {
            filterAll:    f === 'all',
            filterActive: f === 'active',
            filterDone:   f === 'done',
        };
    }

    /** @returns {string} */
    view() {
        return `
            <div class="header">
                <h1>Task Manager</h1>

                <span class="filter-label">Filter:</span>
                <div class="filter-btns">
                    <button class="btn-filter {{#if filterAll}}active{{/if}}"    onclick="setAll">All</button>
                    <button class="btn-filter {{#if filterActive}}active{{/if}}" onclick="setActive">Active</button>
                    <button class="btn-filter {{#if filterDone}}active{{/if}}"   onclick="setDone">Done</button>
                </div>

                <button class="btn-sidebar" onclick="toggleSidebar">
                    {{#if uiStore.sidebarOpen}}Hide Stats{{else}}Show Stats{{/if}}
                </button>
            </div>
        `;
    }

    /** Sets filter to 'all'. */
    setAll() {
        taskStore.setState({ filter: 'all' });
    }

    /** Sets filter to 'active'. */
    setActive() {
        taskStore.setState({ filter: 'active' });
    }

    /** Sets filter to 'done'. */
    setDone() {
        taskStore.setState({ filter: 'done' });
    }

    /** Toggles the sidebar panel visibility. */
    toggleSidebar() {
        uiStore.setState({ sidebarOpen: !uiStore.getState().sidebarOpen });
    }
}

customElements.define('task-header', TaskHeader);
