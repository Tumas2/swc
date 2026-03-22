# Custom Renderer

**What it shows:** Plugging Handlebars.js into SWC's renderer slot. The only change from a
standard component is a `getRenderer()` override — everything else is identical.

## Key concepts

- `getRenderer()` — returns any `(template, context) => string` function
- Handlebars is loaded from a CDN as a global `<script>` tag; it lands on `window.Handlebars`
- The component uses `getTemplatePath()` to load an external `.html` file containing a
  Handlebars template
- NanoRenderer.js is never loaded when Handlebars is used instead

## How to run

Requires internet access (Handlebars is loaded from a CDN). Serve locally:

```bash
php -S localhost:8080
```

Open `http://localhost:8080`, then check DevTools → Network to confirm `NanoRenderer.js`
is not fetched.

## Files

```
custom-renderer/
├── index.html              ← loads Handlebars from CDN before the module script
├── swc.js
├── stores/
│   └── team-store.json
└── components/
    ├── stores.js           ← creates store + seeds initial member data
    ├── index.js
    └── team-list/
        ├── component.js    ← getRenderer() wraps Handlebars.compile()
        ├── markup.html     ← Handlebars template syntax
        └── component.json
```
