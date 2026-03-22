# API Reference — StatefulElement

Full method reference for `StatefulElement`. For usage examples and patterns, see [core.md](core.md).

---

## Methods to override

These are the methods you implement in your component subclass.

### `getStores()`

```
getStores(): { [key: string]: StateStore }
```

Returns an object mapping keys to `StateStore` instances. The component subscribes to all returned stores and re-renders when any of them change. Each store's state is merged into `this.state` under its key.

- Called once in `connectedCallback()`.
- Default returns `{}` (no stores).
- `this.state` is only populated after the first call to `getStores()`.

---

### `view()`

```
view(): string
```

Returns the component's HTML as a string. Called once on connect — the result is stored as the template and passed to the renderer on every render. Use `${this.state.*}` for direct JS interpolation, or pair with [NanoRenderer](nano-renderer.md) for `{{ mustache }}` syntax.

- Default returns `''`.
- For external HTML files, use `getTemplatePath()` instead.
- If Declarative Shadow DOM is found in the server-rendered HTML, that is used as the initial template instead.

---

### `getTemplatePath()`

```
getTemplatePath(): string | null
```

Returns the filesystem path to an external `.html` template file. SWC fetches the file on first mount and caches it for the lifetime of the page. Takes priority over `view()` if both are defined.

- Default returns `null`.
- Use `import.meta.url` to resolve paths relative to the component file:
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

Returns an array of `CSSStyleSheet` objects applied to the Shadow DOM via `adoptedStyleSheets`. Styles are scoped to the component and do not leak out.

- Called once in the constructor, before `connectedCallback()`.
- Default returns `[]`.

---

### `computed(state)`

```
computed(state: object): object
```

Override to return values derived from state. Called on every render. The returned object is merged into the renderer context alongside the raw state.

- When using plain JS template literals in `view()`, call `this.computed(this.state)` manually to access the values.
- When using [NanoRenderer](nano-renderer.md), computed values are injected into the template context automatically.
- Default returns `{}`.

---

### `getRenderer()`

```
getRenderer(): (template: string, context: object) => string
```

Returns the function used to process the template string before it is applied to the DOM. Override to plug in any template engine.

- Default returns `_rawRenderer` — a passthrough that returns the template string unchanged.
- See [NanoRenderer](nano-renderer.md) for the built-in option.

---

### `render()`

```
render(): void
```

Runs on every state change. Calls `_syncState()`, passes the template and context through `getRenderer()`, then calls `html()` to update the DOM via `morph()`.

You can override `render()` if you need full control over the render cycle — for example, if you need `view()` to be called fresh on every render rather than using the cached template:

```javascript
render() {
    this._syncState();
    this.html([this.view()]);
}
```

- Called automatically by the store subscription on state changes.
- Also called once at the end of `connectedCallback()`.

---

### `onMount()`

```
onMount(): void
```

Lifecycle hook called after the component is connected to the DOM and the first render is complete. Use this for side effects — timers, fetch calls, third-party library setup.

- Default is a no-op.

---

### `onUnmount()`

```
onUnmount(): void
```

Lifecycle hook called when the component is removed from the DOM. All store subscriptions and event listeners are cleaned up automatically — use this only for anything you set up manually in `onMount()`.

- Default is a no-op.

---

## Internal methods

These are not intended to be overridden but are useful to understand.

### `html(strings, ...values)`

The method that applies new HTML to the Shadow DOM. Converts `on*` event attributes to stable `data-swc-event-*` attributes, calls `morph()` to diff and patch the DOM in place, then re-attaches event listeners. Also preserves focus and text selection across renders.

Called by `render()`. You can call it directly inside an overridden `render()` if needed.

---

### `_syncState()`

Pulls the latest state from all subscribed stores into `this.state`. Called at the top of `render()`. If you override `render()`, call `this._syncState()` first.

---

### `_findStoreProvider()` *(protected)*

Walks up the DOM — crossing Shadow DOM boundaries — to find the nearest ancestor element that has a `store` property. Used internally by router components (`<router-switch>`, `<router-link>`) to locate the `RouterStore` without explicit prop passing.

Useful if you're building a component that needs to discover a store from an ancestor context rather than importing it directly.
