# State

State in SWC lives in a store — a simple container that holds data and notifies components when that data changes. When a store updates, every component subscribed to it re-renders automatically.

---

## Creating a store

Use `createStore()` to define a store. Give it an id and a default state:

```javascript
import { createStore } from './src/js/store.js';

const userStore = createStore('userStore', {
    name: 'Alex',
    loggedIn: false,
});
```

The id is a string key that identifies the store. It is used by the [store registry](#store-registry) (`getStore()`) and by [SSR](../ssr/README.md) — if the server has injected state under that key, `createStore()` picks it up automatically. If not (which is most of the time when starting out), it just uses your default. Either way the code is the same.

> **Lower-level option:** `new StateStore(initialState)` creates a store without a name. It works fine for simple cases, and it's what you'd extend if you want to add custom methods to a store. `createStore()` uses it internally.

```javascript
import { StateStore } from './src/js/store.js';

// Useful when subclassing:
class RouterStore extends StateStore { ... }
```

---

## Connecting a store to a component

Return your stores from `getStores()`. Each store is merged into `this.state` under the key you give it.

```javascript
class UserBadge extends StatefulElement {
    getStores() {
        return { user: userStore };
    }

    view() {
        return `<span>${this.state.user.name}</span>`;
    }
}
```

The component subscribes when it connects to the DOM and unsubscribes when it disconnects. You never manage subscriptions manually.

---

## Updating state

Call `setState()` with the values you want to change. It does a shallow merge — keys you don't mention stay as they are.

```javascript
// Only loggedIn changes. name is preserved.
userStore.setState({ loggedIn: true });

userStore.getState();
// → { name: 'Alex', loggedIn: true }
```

Resetting to the initial state:

```javascript
userStore.resetState();
// → { name: 'Alex', loggedIn: false }
```

---

## Sharing state between components

Define a store outside your components and import it wherever you need it. Any number of components can subscribe to the same store. When one component updates it, all of them re-render.

```javascript
// stores/cart-store.js
import { createStore } from '../src/js/store.js';

export const cartStore = createStore('cartStore', { items: [], total: 0 });
```

```javascript
// components/cart-icon.js
import { cartStore } from '../stores/cart-store.js';

class CartIcon extends StatefulElement {
    getStores() { return { cart: cartStore }; }
    view() { return `<span>${this.state.cart.items.length}</span>`; }
}
```

```javascript
// components/cart-drawer.js
import { cartStore } from '../stores/cart-store.js';

class CartDrawer extends StatefulElement {
    getStores() { return { cart: cartStore }; }
    // renders full cart list...
}
```

Both `CartIcon` and `CartDrawer` stay in sync. Adding an item from anywhere updates both.

---

## Multiple stores per component

A component can subscribe to as many stores as it needs:

```javascript
getStores() {
    return {
        user: userStore,   // → this.state.user.*
        cart: cartStore,   // → this.state.cart.*
        theme: themeStore, // → this.state.theme.*
    };
}
```

---

## store.json — a shared manifest

You can also pass a `store.json` manifest directly to `createStore()` instead of a name string. This is useful when you want the store's name and default state defined in one file that both JS and the [PHP SSR package](../ssr/php/README.md) can read:

```javascript
import meta from './stores/user-store.json' with { type: 'json' };

const userStore = createStore(meta);
```

A `store.json` file has two formats depending on how much structure you need: `state` for a plain store, `attributes` for a typed store. Use the `$schema` field to get inline validation and autocomplete in your editor.

Once a store is registered with `createStore()`, any component that lists its id in `component.json` and implements `getManifest()` will have that store auto-wired into `this.state` — no `getStores()` required. See [Components → Auto-wiring stores](../components/README.md#auto-wiring-stores-with-getmanifest) for details.

---

### state — plain store

Use `state` when your data is free-form. The object you provide becomes the initial state with no constraints on shape or type:

```json
{
    "$schema": "https://raw.githubusercontent.com/Tumas2/swc/main/schemas/store.schema.json",
    "id": "userStore",
    "state": {
        "name": "",
        "loggedIn": false
    }
}
```

This creates a plain `StateStore`. You can store anything — strings, numbers, arrays, nested objects. `setState()` does a shallow merge and no types are checked.

---

### attributes — typed store

Use `attributes` when you want type safety on individual fields. Each key maps to a `{ type, default }` pair. The initial state is derived from the `default` values:

```json
{
    "$schema": "https://raw.githubusercontent.com/Tumas2/swc/main/schemas/store.schema.json",
    "id": "profileStore",
    "attributes": {
        "name":   { "type": "string",  "default": "" },
        "age":    { "type": "number",  "default": 0 },
        "active": { "type": "boolean", "default": true }
    }
}
```

Supported types: `"string"` `"number"` `"boolean"` `"array"` `"object"`

This creates an `AttributedStateStore`. On every `setState()` call, each incoming value is checked against its declared type. A mismatch logs a `console.warn` — it never throws, so the app keeps running, but the mistake is visible during development:

```
SWC: setState() — "age" expected "number", got "string"
```

`attributes` is a good fit for stores that map closely to form fields or component props, where knowing the expected type upfront prevents subtle bugs.

---

## Store registry

Every store created with `createStore()` is automatically registered by its id. You can retrieve any store from anywhere in your app — no imports required:

```javascript
import { getStore, getAllStores } from './src/js/store.js';

// Get a single store by id
const cart = getStore('cartStore');
cart.setState({ items: [] });

// Get all registered stores (returns a copy of the internal Map)
const stores = getAllStores();
stores.forEach((store, id) => console.log(id, store.getState()));
```

### Exposing to external scripts

If you need the registry accessible from a plain `<script>` tag or another library, call `exposeGlobally()` once from your JS entry point and pass whatever you want to expose:

```javascript
import { exposeGlobally, getStore, getAllStores } from './src/js/store.js';

exposeGlobally({ getStore, getAllStores });          // → window.SWC
exposeGlobally({ getStore, getAllStores }, 'myApp'); // → window.myApp
```

Any script on the page can then reach the registry without imports:

```javascript
// plain <script>, no type="module" needed
const store = window.SWC.getStore('cartStore');
store.setState({ items: [] });
```

This is useful when integrating SWC with other libraries or frameworks, or when building debug tooling that should be able to inspect all stores on the page.

`new StateStore()` and `new AttributedStateStore()` are not registered — the registry is opt-in via `createStore()`.

If `createStore()` is called twice with the same id, the second call returns the existing store and logs a warning — the first registration always wins.

---

[← Components](../components/README.md) | [Next: Templates →](../templates/README.md)
