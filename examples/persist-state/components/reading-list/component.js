import { NanoRenderStatefulElement } from '../../swc.js';
import { readingListStore } from '../stores.js';
import meta from './manifest.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

/**
 * A reading list that persists across page refreshes via localStorage.
 * Demonstrates: persist: true in store.json, getManifest() auto-wiring,
 * event handlers, computed() for derived state, {{#each}}...{{else}}.
 */
export class ReadingList extends NanoRenderStatefulElement {

    /** @returns {CSSStyleSheet[]} */
    getStyles() { return [styles]; }

    /** @returns {object} */
    getManifest() { return meta; }

    /** @returns {string} */
    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }

    /**
     * @param {object} state
     * @returns {object}
     */
    computed(state) {
        const isEmpty = state.readingListStore.items.length === 0;
        return {
            isEmpty,
            isNotEmpty: !isEmpty,
        };
    }

    /**
     * Adds the input value as a new item to the reading list.
     * @param {Event} e
     */
    $addItem(e) {
        e.preventDefault();
        const input = this.shadowRoot.querySelector('#title-input');
        const value = input.value.trim();
        if (!value) return;
        const items = this.state.readingListStore.items;
        readingListStore.setState({ items: [...items, value] });
        input.value = '';
        input.focus();
    }

    /**
     * Removes a single item by index.
     * @param {MouseEvent} e
     */
    $removeItem(e) {
        const index = Number(e.currentTarget.dataset.index);
        const items = this.state.readingListStore.items.filter((_, i) => i !== index);
        readingListStore.setState({ items });
    }

    /**
     * Clears all items from the list and localStorage.
     */
    $clearAll() {
        readingListStore.resetState();
    }
}

customElements.define(meta.name, ReadingList);
