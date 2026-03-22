# Getting Started

## Install

**Option A — GitHub release**

Download the latest release from [GitHub Releases](https://github.com/your-org/swc/releases) and drop the files into your project:

```html
<script type="module" src="./swc.min.js"></script>
```

**Option B — clone or copy**

Clone the repo and use the pre-built files from `dist/`:

```html
<script type="module" src="./dist/swc.min.js"></script>
```

Or copy `src/js/` directly into your project and import from source — no bundler needed:

```javascript
import { StatefulElement, StateStore } from './src/js/index.js';
```

---

## Your first component

A component is a class that extends `StatefulElement` and is registered as a custom HTML element. Let's build a simple greeting.

```javascript
// hello-world.js
import { StatefulElement } from './src/js/StatefulElement.js';

class HelloWorld extends StatefulElement {
    view() {
        return `<p>Hello, world!</p>`;
    }
}

customElements.define('hello-world', HelloWorld);
```

```html
<script type="module" src="./hello-world.js"></script>

<hello-world></hello-world>
```

That's it. SWC creates a Shadow DOM for the component and renders your `view()` into it.

---

## Add state

Components become reactive when you connect them to a `StateStore`. The store holds your data. When the store changes, the component re-renders automatically.

```javascript
// counter.js
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

```html
<my-counter></my-counter>
```

Click the buttons and the count updates — no manual DOM manipulation, no event system to wire up. `setState()` merges the new value into the store and SWC re-renders any component that listed that store in `getStores()`.

---

## What's next

- Read [Web Components](../web-components/README.md) to understand the platform standard SWC is built on
- Read [Components](../components/README.md) to learn all the things a component can do
- Read [State](../state/README.md) to understand stores, shared state, and more

---

[← Introduction](../README.md) | [Next: Web Components →](../web-components/README.md)
