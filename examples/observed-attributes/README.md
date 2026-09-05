# Observed Attributes

**What it shows:** A component that re-renders in response to an HTML attribute changing from outside.

The `alert-box` component declares `static observedAttributes = ['type']`. When the attribute
changes — via `setAttribute()` from page-level JS or from a parent component's template — SWC's
`attributeChangedCallback` fires and calls `render()` automatically. No store is needed.

## Key concepts

- `static observedAttributes` — tells the browser which attributes to watch
- SWC implements `attributeChangedCallback` for you; it calls `render()` when any watched attribute changes
- `computed()` reads `this.getAttribute('type')` on every render so the template always reflects the current value
- Attributes are the right tool for per-instance configuration passed from outside, as opposed to shared app state (which belongs in a store)

## How to run

```bash
php -S localhost:8080
```

Open `http://localhost:8080`.

## Files

```
observed-attributes/
├── index.html                 ← static examples + live demo driven by page-level JS
├── swc.js
└── components/
    ├── index.js
    └── alert-box/             ← observedAttributes, computed(), no stores
```
