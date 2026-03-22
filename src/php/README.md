# SWC PHP SSR

Server-side rendering for [SWC (Stateful Web Components)](../../../../README.md). Renders components as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) so content is visible before JavaScript loads — zero flicker when JS hydrates.

**Requirements:** PHP ≥ 8.5, `ext-dom`

## Classes

| Class | Description |
| :--- | :--- |
| `StoreRegistry` | Auto-discovers `store.json` files, manages state, emits `<script>` tag |
| `ComponentRegistry` | Auto-discovers `component.json` files, renders with store state |
| `Component` | Renders a single component to a DSD HTML string |
| `StateInjector` | Low-level: collects state and emits `window.__SWC_INITIAL_STATE__` |
| `NanoRenderer` | PHP port of the JS NanoRenderer — processes `markup.html` templates |

## Documentation

See [docs/ssr/php/](../../../docs/ssr/php/README.md) for full usage, examples, and API reference.
