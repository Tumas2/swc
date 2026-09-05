import { NanoRenderStatefulElement } from 'swc';
import { mealStore } from '../stores.js';

/**
 * Host A. Subscribes to mealStore itself, and passes it down under the neutral
 * alias `data` alongside the key the child should read.
 */
const meta = {
    name: 'meal-host',
    version: '1.0.0',
    stores: ['mealStore'],
    components: ['logged-days'],
    provides: {
        data: 'mealStore',
        loggedKey: 'days',
    },
};

export class MealHost extends NanoRenderStatefulElement {

    getManifest() {
        return meta;
    }

    computed(state) {
        return { total: Object.keys(state.mealStore?.days ?? {}).length };
    }

    view() {
        return `
            <h2>Meals <span class="tag">provides data → mealStore</span></h2>
            <logged-days></logged-days>
            <button onclick="$addDay">Log a meal on 2026-09-06</button>
            <p class="note">host sees {{ total }} day(s)</p>
        `;
    }

    $addDay() {
        const { days } = mealStore.getState();
        mealStore.setState({ days: { ...days, '2026-09-06': ['Late snack'] } });
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                display: block; padding: 1rem; border: 1px solid #ddd;
                border-radius: 8px; font: 14px system-ui, sans-serif;
            }
            h2 { font-size: 1rem; margin: 0 0 .75rem; }
            .tag {
                font-weight: normal; font-size: .75rem; color: #fff;
                background: #2E7D52; padding: .1rem .4rem; border-radius: 3px;
            }
            button { margin-top: .75rem; padding: .35rem .6rem; cursor: pointer; }
            .note { color: #666; font-size: .8rem; margin: .5rem 0 0; }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, MealHost);
