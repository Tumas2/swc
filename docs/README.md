# Core — StatefulElement & StateStore

## Component Structure

A component is just a class that extends `StatefulElement`. There are no required files or folders — put it wherever makes sense for your project:

```javascript
// hello-world.js
import { StatefulElement } from './src/js/StatefulElement.js';

class MyCounter extends StatefulElement {

    getStyles() {
        const styles = new CSSStyleSheet();
        styles.replaceSync(`h1 { color: red; }`);

        return [styles];
    }


    view() {
        return `<h1>Hello world!</h1>`;
    }

}

customElements.define('my-counter', MyCounter);
```

### Split-file pattern (recommended for larger projects)

As components grow, keeping logic, markup, and styles in separate files makes them easier to maintain and reuse — especially when using an external template renderer or the [PHP SSR](php-ssr.md) package.

```
components/my-counter/
├── component.js   — class definition + customElements.define()
├── markup.html    — HTML template (used by NanoRenderer and PHP SSR)
└── style.css      — scoped styles applied to the Shadow DOM
```

An optional `component.json` manifest enables auto-discovery by `ComponentRegistry` ([PHP SSR](php-ssr.md)) and `defineComponent()`:

```json
{
    "name": "my-counter",
    "version": "1.0.0",
    "title": "My Counter",
    "stores": ["counterStore"]
}
```

---

## StatefulElement

`StatefulElement` is the base class for all SWC components. It handles state subscriptions, re-rendering, and event binding for you. For the full method reference, see [api-stateful-element.md](api-stateful-element.md).

### Connecting state

Tell the component which stores to subscribe to by returning them from `getStores()`. Each store is available under its key in `this.state`. The component re-renders automatically whenever any of those stores change.

```javascript
import { StatefulElement } from './src/js/StatefulElement.js';
import { StateStore } from './src/js/store.js';

const cartStore = new StateStore({ items: [], total: 0 });
const userStore = new StateStore({ name: 'Alex', loggedIn: false });

class CartSummary extends StatefulElement {
    getStores() {
        return {
            cart: cartStore,   // → this.state.cart.items, this.state.cart.total
            user: userStore,   // → this.state.user.name
        };
    }

    view() {
        return `
            <p>Hello, ${this.state.user.name}</p>
            <p>${this.state.cart.items.length} items — $${this.state.cart.total}</p>
        `;
    }
}

customElements.define('cart-summary', CartSummary);
```

Multiple components can subscribe to the same store. Calling `cartStore.setState(...)` re-renders every component that listed it in `getStores()`.

### Updating state from the template

Write `onclick="methodName"` in your template — no parentheses, no `this.`. SWC wires it up to the matching method on your class automatically. The handler receives the native `Event` object.

```javascript
import { StatefulElement } from './src/js/StatefulElement.js';
import { StateStore } from './src/js/store.js';

const counterStore = new StateStore({ count: 0 });

class MyCounter extends StatefulElement {
    getStores() {
        return { counter: counterStore };
    }

    view() {
        return `
            <button onclick="decrement">−</button>
            <span>${this.state.counter.count}</span>
            <button onclick="increment">+</button>
        `;
    }

    increment() {
        counterStore.setState({ count: this.state.counter.count + 1 });
    }

    decrement() {
        counterStore.setState({ count: this.state.counter.count - 1 });
    }
}

customElements.define('my-counter', MyCounter);
```

### Styles

Return an array of `CSSStyleSheet` objects from `getStyles()`. They are applied to the Shadow DOM and never leak out.

```javascript
// Option A — inline (good for small amounts of CSS)
class MyCounter extends StatefulElement {
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`
            :host { display: flex; gap: 0.5rem; }
            button { border-radius: 4px; }
        `);
        return [sheet];
    }
}
```

```javascript
// Option B — CSS Module Script (recommended for the split-file pattern)
import styles from './style.css' with { type: 'css' };

class MyCounter extends StatefulElement {
    getStyles() {
        return [styles];
    }
}
```

### External templates

For larger templates, keep HTML in a separate file and point to it with `getTemplatePath()`. SWC fetches and caches it on first mount.

```javascript
class MyCounter extends StatefulElement {
    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}
```

Pair this with [NanoRenderer](nano-renderer.md) for `{{ mustache }}` syntax inside `markup.html`.

### Derived / computed values

Use `computed()` to calculate values from state before the template renders. The returned object is merged into the template context alongside `this.state`.

```javascript
class UserCard extends StatefulElement {
    getStores() {
        return { user: userStore };
    }

    computed(state) {
        return {
            fullName: `${state.user.firstName} ${state.user.lastName}`,
            memberSince: new Date(state.user.createdAt).getFullYear(),
        };
    }

    view() {
        // both this.state.user.* and computed values are available
        const { fullName, memberSince } = this.computed(this.state);
        return `<p>${fullName} — member since ${memberSince}</p>`;
    }
}
```

> When using [NanoRenderer](nano-renderer.md), computed values are injected into the template context automatically — no need to call `computed()` manually inside `view()`.

### Lifecycle hooks

`onMount()` runs after the first render. `onUnmount()` runs when the element is removed from the DOM. Use these for timers, fetch calls, or any cleanup.

```javascript
class LiveClock extends StatefulElement {
    onMount() {
        this.timer = setInterval(() => {
            clockStore.setState({ time: new Date().toLocaleTimeString() });
        }, 1000);
    }

    onUnmount() {
        clearInterval(this.timer);
    }
}
```

### Registering with component.json

If you're using the split-file pattern, `defineComponent()` lets you register the element using the name from `component.json` instead of a hardcoded string:

```javascript
import { defineComponent } from './src/js/index.js';
import meta from './component.json' with { type: 'json' };

defineComponent(meta, MyCounter);
// same as: customElements.define('my-counter', MyCounter)
```

---

## StateStore

`StateStore` is a simple pub/sub state container. Create one instance and share it across as many components as needed.

```javascript
import { StateStore } from './src/js/store.js';

const userStore = new StateStore({ name: 'Alex', loggedIn: false });
```

### Methods

| Method | Description |
| :--- | :--- |
| `setState(partial)` | Shallow-merges `partial` into state and notifies all subscribers |
| `getState()` | Returns the current state object |
| `resetState()` | Resets to the initial state passed to the constructor |
| `subscribe(fn)` | Registers a callback, called synchronously on every `setState` |
| `unsubscribe(fn)` | Removes a previously registered callback |

```javascript
userStore.setState({ loggedIn: true });       // merge
userStore.getState();                          // { name: 'Alex', loggedIn: true }
userStore.resetState();                        // { name: 'Alex', loggedIn: false }
```

> **Note:** `setState` notifies subscribers **synchronously**. Calling `setState` from inside a render callback requires a guard to avoid infinite loops.

---

## createStore() — SSR-aware factory

When using the [PHP SSR package](php-ssr.md), the server injects state via `window.__SWC_INITIAL_STATE__`. Use `createStore()` instead of `new StateStore()` to pick that up automatically:

```javascript
import { createStore } from './src/js/store.js';

// Plain key + default state
const userStore = createStore('userStore', { name: '', loggedIn: false });

// Or pass a store.json manifest directly
import meta from './stores/user-store.json' with { type: 'json' };
const userStore = createStore(meta);
```

If the server has set `window.__SWC_INITIAL_STATE__.userStore`, that data is used as the initial state. Otherwise, the JS default is used. `resetState()` always resets to the JS default, never the server state.

### store.json

A store manifest file defines the store's name and default state for both JS (`createStore`) and [PHP SSR](php-ssr.md) (`StoreRegistry`):

```json
{
    "name": "userStore",
    "title": "User Store",
    "state": {
        "name": "",
        "loggedIn": false
    }
}
```
