"use strict";

/** @type {WeakSet<CSSStyleSheet>} */
const _injected = new WeakSet();

/**
 * Injects one or more CSSStyleSheet objects into `document.adoptedStyleSheets`.
 * Safe to call repeatedly — sheets already injected are skipped.
 *
 * Use inside `getStyles()` to load document-level styles (e.g. `@font-face`)
 * alongside a component's own scoped styles. This is necessary because
 * `@font-face` declarations inside a Shadow DOM are ignored by the browser —
 * fonts must be declared at the document level to be usable.
 *
 * @param {...CSSStyleSheet} sheets
 */
export function setDocumentStyles(...sheets) {
    const toAdd = sheets.filter(s => !_injected.has(s));
    if (toAdd.length === 0) return;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, ...toAdd];
    toAdd.forEach(s => _injected.add(s));
}
