import { NanoRenderStatefulElement } from 'swc';
import { skillsStore } from '../stores.js';
import localStyles from './style.css' with { type: 'css' };
import meta from './component.json' with { type: 'json' };

/**
 * Searchable skills grid.
 * Demonstrates: oninput, computed() for live filtering, {{#each}}...{{else}},
 * {{#if this.iconUrl}}, {{{unescaped}}} in src attribute,
 * onMount() / onUnmount() lifecycle hooks, split-file pattern.
 */
export class SkillsGrid extends NanoRenderStatefulElement {

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
        return { skillsStore };
    }

    /**
     * Filters skills by the current search query.
     * @param {Object} state
     * @returns {Object}
     */
    computed(state) {
        const q = state.skillsStore.query.toLowerCase().trim();
        const all = state.skillsStore.skills;
        return {
            filteredSkills: q ? all.filter(s => s.name.toLowerCase().includes(q)) : all,
        };
    }

    /**
     * Updates the search query in the store.
     * @param {InputEvent} e
     */
    $handleInput(e) {
        skillsStore.setState({ query: e.target.value });
    }

    /** Logs mount. */
    onMount() {
        console.log('[skills-grid] mounted with', this.state.skillsStore.skills.length, 'skills');
    }

    /** Logs unmount. */
    onUnmount() {
        console.log('[skills-grid] unmounted');
    }
}

customElements.define(meta.name, SkillsGrid);
