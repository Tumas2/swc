# SWC PHP SSR

Server-side rendering for [SWC (Stateful Web Components)](../../../../README.md). Renders components as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) so content is visible before JavaScript loads — zero flicker when JS hydrates.

**Requirements:** PHP ≥ 8.4, `ext-dom`

## Classes

| Class | Description |
| :--- | :--- |
| `StoreRegistry` | Auto-discovers `store.json` files from one or more folders, manages state, emits `<script>` tag |
| `ComponentRegistry` | Auto-discovers `manifest.json` files from one or more folders, renders with store state, context and nested components |
| `Component` | Renders a single component as DSD, or as flattened light DOM for static output |
| `StateInjector` | Low-level: collects state and emits `window.__SWC_INITIAL_STATE__` |
| `NanoRenderer` | PHP port of the JS NanoRenderer — same output as the JS version for the same template and data |
| `TemplateLoader` | Loads `markup.html` and resolves `{{#html './partial.html'}}` includes |
| `Sanitizer` | Cleans HTML for `{{{safe ...}}}` output |
| `Markup` | Internal HTML scanner used for event attributes, slots and nested components |

## Parity with the JS side

The server output is built to match the first client render exactly, so hydration keeps every server-rendered node:

- `NanoRenderer` follows JavaScript semantics — truthiness (`"0"` and `[]` are truthy), `true` → `"true"`, number formatting, `.length`, and `{{#each}}` only over lists.
- `on*` attributes become `data-swc-event-*`, as `StatefulElement` does before morphing.
- Output has no added whitespace and the stylesheet `<link>` comes after the markup, so the positional morph only removes the link.

PHP arrays cannot tell `{}` from `[]`. Where that matters, pass `stdClass` objects (e.g. `json_decode($json)` without `$associative`); the renderer and `StateInjector` accept both.

## Tests

```bash
php tests/run.php
```

No dependencies. The parity tests render every case through the real JS `NanoRenderer` with Node.js and compare the output byte for byte; they are skipped when `node` is not on `PATH`.

## Documentation

See [docs/ssr/php/](../../../docs/ssr/php/README.md) for full usage, examples, and API reference.
