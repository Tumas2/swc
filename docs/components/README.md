# Components

A component in SWC is a class that extends `StatefulElement`, registered as a custom HTML element. It manages its own Shadow DOM, subscribes to state stores, and re-renders when data changes.

For a full list of every available method, see the [API Reference](../api/stateful-element.md).

---

## Defining a component

At minimum, a component needs a `view()` method and a `customElements.define()` call:

```javascript
import { StatefulElement } from './src/js/StatefulElement.js';

class SiteHeader extends StatefulElement {
    view() {
        return `<header><slot></slot></header>`;
    }
}

customElements.define('site-header', SiteHeader);
```

```html
<site-header>My App</site-header>
```

The `<slot>` element passes children through — this is a standard Shadow DOM feature.

---

## File structure

There are no rules about where files live. A simple component can be a single file. As components grow — or when you want to reuse them with the [PHP SSR](../ssr/php/README.md) package — splitting into separate files keeps things manageable.

### Single file
Good for small components or prototyping:

```
components/
└── my-counter.js
```

### Split-file pattern
Recommended for anything you'll maintain or share:

```
components/my-counter/
├── component.js    — class definition and customElements.define()
├── component.json  — manifest (name, version, stores)
├── markup.html     — HTML template (used by NanoRenderer and PHP SSR)
└── style.css       — scoped styles for this component
```

### component.json
`component.json` holds the element name, version, and the list of stores the component subscribes to. The manifest is read by `ComponentRegistry` on the PHP SSR side for auto-discovery:

```json
{
    "$schema": "https://raw.githubusercontent.com/Tumas2/swc/main/schemas/component.schema.json",
    "name": "my-counter",
    "version": "1.0.0",
    "stores": ["counterStore"]
}
```

The name can also be imported and passed to `customElements.define()` to avoid hardcoding it in two places:

```javascript
import meta from './component.json' with { type: 'json' };

customElements.define(meta.name, MyCounter);
```

#### Auto-wiring stores with getManifest()

If you return the manifest from `getManifest()`, any stores listed in `component.json` are resolved from the store registry automatically — no `getStores()` needed:

```javascript
import { NanoRenderStatefulElement } from '../../swc.js';
import meta from './component.json' with { type: 'json' };
import styles from './style.css' with { type: 'css' };

export class MyCounter extends NanoRenderStatefulElement {
    getManifest() { return meta; }
    getStyles()   { return [styles]; }
    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}

customElements.define(meta.name, MyCounter);
```

Each store id becomes a key in `this.state` directly — `"counterStore"` becomes `this.state.counterStore`. This keeps your JS and PHP SSR in sync: both read from the same manifest.

If you implement both `getManifest()` (with stores) and `getStores()`, the manifest takes precedence and a warning is logged to remind you to remove the redundant one.

If you need a store under a custom key (e.g. `this.state.counter` instead of `this.state.counterStore`), use `getStores()` directly instead.

---

## Lifecycle

SWC components have four lifecycle moments you can hook into:

### On connect — `connectedCallback`

Called by the browser when the element is added to the DOM. SWC handles this internally — it sets up Shadow DOM, subscribes to stores, and runs the first render. You don't override this directly.

### After first render — `onMount()`

Called after the component is connected and the first render is complete. Use this for timers, fetch calls, or anything that needs the DOM to be ready.

```javascript
onMount() {
    this.timer = setInterval(() => {
        clockStore.setState({ time: new Date().toLocaleTimeString() });
    }, 1000);
}
```

### On disconnect — `onUnmount()`

Called when the element is removed from the DOM. SWC automatically cleans up store subscriptions and event listeners. Use this only for things you set up manually in `onMount()`.

```javascript
onUnmount() {
    clearInterval(this.timer);
}
```

### On state change — `render()`

Called automatically every time a subscribed store changes. You rarely need to override this — it syncs state, runs the renderer, and updates the DOM via `morph()`. See the [API Reference](../api/stateful-element.md#render) if you need custom render behaviour.

---

## Computed values

If you need values derived from state — formatted dates, filtered lists, combined fields — return them from `computed()`. They are recalculated on every render and available in the template alongside `this.state`.

```javascript
computed(state) {
    return {
        fullName: `${state.user.firstName} ${state.user.lastName}`,
        itemCount: state.cart.items.length,
    };
}

view() {
    const { fullName, itemCount } = this.computed(this.state);
    return `<p>${fullName} has ${itemCount} items in their cart.</p>`;
}
```

When using [NanoRenderer](../templates/README.md), computed values are injected into the template context automatically — no manual call needed.

---

## Sharing logic across components

**Utility functions** — keep them in a plain JS module and import wherever needed:

```javascript
// utils/format.js
export function formatPrice(n) { return `$${n.toFixed(2)}`; }
```

```javascript
// components/cart-item/component.js
import { formatPrice } from '../../utils/format.js';

class CartItem extends StatefulElement {
    view() {
        return `<li>${this.state.cart.name} — ${formatPrice(this.state.cart.price)}</li>`;
    }
}
```

**Shared component behaviour** — if multiple components need the same methods or lifecycle logic, extend `StatefulElement` once and have them extend your base class instead. This is also how you share a renderer or global template values across the whole project (see [Templates](../templates/README.md) for an example).

**Third-party scripts** — if a library is loaded as a `<script>` tag in `<head>` it lands on `window` and is available directly inside lifecycle hooks:

```javascript
onMount() {
    const canvas = this.shadowRoot.querySelector('canvas');
    this._chart = new Chart(canvas, { type: 'bar', data: this.state.chart });
}

onUnmount() {
    this._chart?.destroy();
}
```

---

[← Web Components](../web-components/README.md) | [Next: State →](../state/README.md)
