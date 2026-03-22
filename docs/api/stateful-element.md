# StatefulElement — API Reference

Full method reference for `StatefulElement`. For usage examples and patterns, see [Components](../components/README.md).

---

## Methods to override

### `getStores()`

```
getStores(): { [key: string]: StateStore }
```

Returns an object mapping keys to `StateStore` instances. The component subscribes to all returned stores and re-renders when any of them change. Each store's state is merged into `this.state` under its key.

- Called once during `connectedCallback()`.
- Default returns `{}`.

---

### `view()`

```
view(): string
```

Returns the component's HTML as a string. Called once on connect — the result is stored as the template and passed to the renderer on every subsequent render.

- Use `${this.state.*}` for direct JS interpolation, or pair with [NanoRenderer](../templates/README.md) for `{{ mustache }}` syntax.
- For external HTML files, use `getTemplatePath()` instead.
- If the server rendered Declarative Shadow DOM into the element, that is used as the initial template instead of `view()`.
- Default returns `''`.

---

### `getTemplatePath()`

```
getTemplatePath(): string | null
```

Returns the filesystem path to an external `.html` template file. SWC fetches the file on first mount and caches it for the lifetime of the page. Takes priority over `view()` if both are defined.

- Use `import.meta.url` to resolve paths relative to the component file.
- Default returns `null`.

```javascript
getTemplatePath() {
    return new URL('./markup.html', import.meta.url).pathname;
}
```

---

### `getStyles()`

```
getStyles(): CSSStyleSheet[]
```

Returns an array of `CSSStyleSheet` objects applied to the Shadow DOM via `adoptedStyleSheets`. Accepts multiple stylesheets — they are applied in order.

- Called once in the constructor, before `connectedCallback()`.
- Default returns `[]`.

See [Styles](../styles/README.md) for patterns including shared stylesheets.

---

### `computed(state)`

```
computed(state: object): object
```

Override to return values derived from state. Called on every render. The returned object is merged into the renderer context alongside the raw state.

- When using plain JS template literals, call `this.computed(this.state)` manually inside `view()`.
- When using [NanoRenderer](../templates/README.md), computed values are injected into the template context automatically.
- Default returns `{}`.

---

### `getRenderer()`

```
getRenderer(): (template: string, context: object) => string
```

Returns the function used to process the template string before it is applied to the DOM. Override to plug in any template engine.

- Default returns `_rawRenderer` — a passthrough that returns the template string unchanged.
- See [Templates](../templates/README.md) for the built-in NanoRenderer option.

---

### `render()`

```
render(): void
```

Runs on every state change. Syncs `this.state`, passes the template and context through `getRenderer()`, then calls `html()` to update the DOM via `morph()`.

Override when you need full control over the render cycle — for example, if you want `view()` called fresh on every render rather than using the cached template:

```javascript
render() {
    this._syncState();
    this.html([this.view()]);
}
```

- Called automatically by store subscriptions on state changes.
- Called once at the end of `connectedCallback()`.

---

### `onMount()`

```
onMount(): void
```

Lifecycle hook called after the component connects to the DOM and the first render is complete. Use this for timers, fetch calls, or third-party library setup.

- Default is a no-op.

---

### `onUnmount()`

```
onUnmount(): void
```

Lifecycle hook called when the component is removed from the DOM. Store subscriptions and event listeners are cleaned up automatically — use this only for anything you set up manually in `onMount()`.

- Default is a no-op.

---

## Internal methods

These are not intended to be overridden but are useful to understand when reading the source or building advanced components.

### `html(strings, ...values)`

Applies new HTML to the Shadow DOM. Converts `on*` event attributes to stable `data-swc-event-*` attributes, calls `morph()` to diff and patch the DOM in place, then re-attaches event listeners. Preserves focus and text selection across renders.

Called by `render()`. Can be called directly inside an overridden `render()`.

---

### `_syncState()`

Pulls the latest state from all subscribed stores into `this.state`. Called at the top of `render()`. If you override `render()`, call `this._syncState()` first.

---

### `_findStoreProvider()` *(protected)*

Walks up the DOM — crossing Shadow DOM boundaries — to find the nearest ancestor element with a `store` property. Used by router components to locate the `RouterStore` without importing it directly.

Useful if you're building a component that needs to discover a contextual store from an ancestor rather than a shared module import.

---

[← API Reference](README.md)
