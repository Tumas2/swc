import { NanoRenderStatefulElement } from 'swc';

/**
 * Renders the same list twice — once keyed, once not — and reverses both on
 * demand. After a reverse the keyed row keeps each chip's click count with its
 * label; the unkeyed row does not, because positional matching replaced the
 * elements.
 */
const meta = {
    name: 'reorder-host',
    version: '1.0.0',
    components: ['counter-chip'],
};

export class ReorderHost extends NanoRenderStatefulElement {

    _items = [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Bravo' },
        { id: 'c', label: 'Charlie' },
    ];

    getManifest() {
        return meta;
    }

    computed() {
        return { items: this._items };
    }

    view() {
        return `
            <h2>Reorder</h2>

            <p class="row-label">Keyed — each chip carries a key attribute</p>
            <div class="row">
                {{#each items}}
                    <counter-chip key="{{ this.id }}" label="{{ this.label }}"></counter-chip>
                {{/each}}
            </div>

            <p class="row-label">Unkeyed — positional matching</p>
            <div class="row">
                {{#each items}}
                    <counter-chip label="{{ this.label }}"></counter-chip>
                {{/each}}
            </div>

            <button class="go" onclick="$reverse">Reverse both</button>
        `;
    }

    $reverse() {
        this._items = [...this._items].reverse();
        this.render();
    }

    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host {
                display: block; padding: 1rem; border: 1px solid #ddd;
                border-radius: 8px; font: 14px system-ui, sans-serif;
            }
            h2 { font-size: 1rem; margin: 0 0 .75rem; }
            .row-label { color: #666; font-size: .8rem; margin: .75rem 0 .35rem; }
            .row { display: flex; gap: .4rem; flex-wrap: wrap; }
            code { background: #eee; padding: 0 .25rem; border-radius: 3px; }
            .go { margin-top: 1rem; padding: .35rem .6rem; cursor: pointer; }
        `);
        return [sheet];
    }
}

customElements.define(meta.name, ReorderHost);
