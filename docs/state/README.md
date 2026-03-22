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

A `store.json` file defines the store's id and default state. It is used by both `createStore()` on the JS side and `StoreRegistry` on the PHP side — one source of truth for both:

```json
{
    "id": "userStore",
    "state": {
        "name": "",
        "loggedIn": false
    }
}
```

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

This is useful when integrating SWC with other libraries or frameworks that need access to your stores, or when building debug tooling that should be able to inspect all stores on the page.

`new StateStore()` and `new AttributedStateStore()` are not registered — the registry is opt-in via `createStore()`.

If `createStore()` is called twice with the same id, the second call returns the existing store and logs a warning — the first registration always wins.

---

[← Components](../components/README.md) | [Next: Templates →](../templates/README.md)
