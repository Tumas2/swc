export { StatefulElement } from './StatefulElement.js';
export { StateStore, createStore } from './store.js';
export { NanoRenderer, NanoRenderStatefulElement } from './NanoRenderer.js';
export { morph } from './dom-morph.js';

/**
 * Registers a custom element using the name from a component.json manifest.
 * Mirrors customElements.define(name, Class) — manifest comes first, class second.
 * Optional: users can still call customElements.define() directly.
 *
 * @param {{name: string}} meta - The component.json manifest object.
 * @param {CustomElementConstructor} ElementClass - The custom element class to register.
 */
export function defineComponent(meta, ElementClass) {
    customElements.define(meta.name, ElementClass);
}
