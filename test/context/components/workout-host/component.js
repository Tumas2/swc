import { NanoRenderStatefulElement, createStore } from 'swc';
import { workoutStore } from '../stores.js';

/**
 * Host B. Same child, different store and different key.
 *
 * Also exercises the merge fix: it declares a store in the manifest AND
 * returns one from getStores(). Before the merge change the manifest won and
 * the getStores() one was silently dropped with a console warning. Both should
 * now resolve, with no warning.
 */
const localUi = createStore({ id: 'workoutUiStore', state: { clicks: 0 } });

const meta = {
    name: 'workout-host',
    version: '1.0.0',
    stores: ['workoutStore'],
    components: ['logged-days'],
    provides: {
        data: 'workoutStore',
        loggedKey: 'workouts',
    },
};

export class WorkoutHost extends NanoRenderStatefulElement {

    getManifest() {
        return meta;
    }

    /** Merged with the manifest store above, not discarded. */
    getStores() {
        return { ui: localUi };
    }

    computed(state) {
        return {
            total: Object.keys(state.workoutStore?.workouts ?? {}).length,
            clicks: state.ui?.clicks ?? 0,
        };
    }

    view() {
        return `
            <h2>Workouts <span class="tag">provides data → workoutStore</span></h2>
            <logged-days></logged-days>
            <button onclick="$addDay">Log a workout on 2026-09-06</button>
            <p class="note">
                host sees {{ total }} day(s) — getStores() store says {{ clicks }} click(s)
            </p>
        `;
    }

    $addDay() {
        const { workouts } = workoutStore.getState();
        workoutStore.setState({ workouts: { ...workouts, '2026-09-06': ['Pull-ups'] } });
        localUi.setState({ clicks: localUi.getState().clicks + 1 });
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
                background: #7D2E52; padding: .1rem .4rem; border-radius: 3px;
            }
            button { margin-top: .75rem; padding: .35rem .6rem; cursor: pointer; }
            .note { color: #666; font-size: .8rem; margin: .5rem 0 0; }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, WorkoutHost);
