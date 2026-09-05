import { NanoRenderStatefulElement } from 'swc';

/**
 * Holds state nothing outside it knows about. If a reorder replaces the element
 * instead of moving it, this count resets to zero — which is exactly what the
 * `key` attribute exists to prevent.
 */
const meta = {
    name: 'counter-chip',
    version: '1.0.0',
};

export class CounterChip extends NanoRenderStatefulElement {

    _count = 0;

    // Without this the label is read once and never refreshed — morph updates the
    // attribute in the DOM but nothing tells the component to re-render.
    static observedAttributes = ['label'];

    getManifest() {
        return meta;
    }

    computed() {
        return {
            label: this.getAttribute('label') ?? '?',
            count: this._count,
        };
    }

    view() {
        return `<button onclick="$bump">{{ label }} — clicked {{ count }}×</button>`;
    }

    $bump() {
        this._count += 1;
        this.render();
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: inline-block; }
            button {
                font: 13px system-ui, sans-serif; padding: .3rem .6rem;
                border: 1px solid #bbb; border-radius: 999px;
                background: #fff; cursor: pointer;
            }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, CounterChip);
