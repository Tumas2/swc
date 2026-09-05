import { NanoRenderStatefulElement, createStore } from 'swc';

/**
 * A persisted store with two independent fields. The point of having two is that
 * a tab can write one while the other tab holds a newer value for the other —
 * which is exactly the case that used to lose data.
 */
export const probeStore = createStore({
    id: 'probeStore',
    persist: true,
    state: { left: 0, right: 0, note: '' },
});

const meta = {
    name: 'tab-probe',
    version: '1.0.0',
    stores: ['probeStore'],
};

export class TabProbe extends NanoRenderStatefulElement {

    getManifest() {
        return meta;
    }

    computed(state) {
        const { left, right, note } = state.probeStore;
        return { left, right, note: note || '(empty)' };
    }

    view() {
        return `
            <div class="grid">
                <button onclick="$bumpLeft">left: {{ left }}</button>
                <button onclick="$bumpRight">right: {{ right }}</button>
            </div>
            <p class="note">note: <b>{{ note }}</b></p>
            <input class="input" placeholder="type a note" onchange="$setNote">
            <button class="reset" onclick="$reset">Reset</button>
        `;
    }

    $bumpLeft()  { probeStore.setState({ left: probeStore.getState().left + 1 }); }
    $bumpRight() { probeStore.setState({ right: probeStore.getState().right + 1 }); }

    $setNote(e) {
        probeStore.setState({ note: e.currentTarget.value });
    }

    $reset() {
        probeStore.resetState();
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                display: block; padding: 1rem; border: 1px solid #ddd;
                border-radius: 8px; font: 14px system-ui, sans-serif;
            }
            .grid { display: flex; gap: .5rem; }
            button { padding: .4rem .7rem; cursor: pointer; }
            .note { color: #444; }
            .input { padding: .35rem; width: 100%; box-sizing: border-box; }
            .reset { margin-top: .5rem; }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, TabProbe);
