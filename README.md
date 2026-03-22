# SWC — Stateful Web Components

A lightweight Vanilla JavaScript library for building reactive Web Components. No build step, no dependencies — just copy the files and go.

## Install

**Option A — GitHub release (recommended)**

Download the latest release from [GitHub Releases](https://github.com/your-org/swc/releases) and include the pre-built files:

```html
<script type="module" src="./swc.min.js"></script>
<!-- optional router add-on -->
<script type="module" src="./swc-router.min.js"></script>
```

**Option B — built from source**

Use the pre-built files from `dist/` if you've cloned the repo:

```html
<script type="module" src="./dist/swc.min.js"></script>
<script type="module" src="./dist/swc-router.min.js"></script>
```

**Option C — uncompiled source**

Copy `src/js/` into your project and import directly. No bundler required.

| File | Required | Description |
| :--- | :--- | :--- |
| `StatefulElement.js` | Yes | Base component class |
| `store.js` | Yes | State store (pub/sub) |
| `dom-morph.js` | Yes | In-place DOM diffing engine |
| `html-loader.js` | Yes | External template loader |
| `NanoRenderer.js` | Optional | `{{ mustache }}` template engine |
| `router/` | Optional | Client-side routing components |

```javascript
import { StatefulElement, StateStore, createStore } from './src/js/index.js';
```

## Quick Start

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

    increment() { counterStore.setState({ count: this.state.counter.count + 1 }); }
    decrement() { counterStore.setState({ count: this.state.counter.count - 1 }); }
}

customElements.define('my-counter', MyCounter);
```

```html
<my-counter></my-counter>
```

State changes automatically re-render the component — no manual DOM manipulation needed.

## Documentation

| Topic | File |
| :--- | :--- |
| Component API, stores, events | [docs/core.md](docs/core.md) |
| `{{ mustache }}` template syntax | [docs/nano-renderer.md](docs/nano-renderer.md) |
| Client-side routing | [docs/router.md](docs/router.md) |
| PHP server-side rendering | [docs/php-ssr.md](docs/php-ssr.md) |

## PHP SSR (optional)

`src/php/` is a standalone Composer package for server-side rendering of SWC components as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom). It is entirely optional — the JS library works without it. See [docs/php-ssr.md](docs/php-ssr.md).
