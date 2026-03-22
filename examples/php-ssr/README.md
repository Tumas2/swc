# PHP SSR

**What it shows:** Server-side rendering with the PHP package. The blog post is rendered as
Declarative Shadow DOM before JavaScript loads — view source and you'll see the full content
already in the HTML. When JS arrives, it reads `window.__SWC_INITIAL_STATE__` and the first
render is a no-op (nothing to change).

## Key concepts

- `StoreRegistry` — loads `store.json` manifests; `merge()` injects real data
- `ComponentRegistry` — auto-discovers components; `render()` outputs DSD HTML
- `preload_tags()` — `<link rel="preload">` hints for component stylesheets
- `script_tags()` — `<script type="module">` for each component's JS
- `to_script_tag()` — emits `window.__SWC_INITIAL_STATE__` for hydration
- `createStore()` on the JS side picks up server state automatically

## How to run

Requires PHP ≥ 8.0 with `ext-dom`. Serve from XAMPP or the PHP built-in server:

```bash
php -S localhost:8080
```

Then visit `http://localhost:8080`.

**Note:** Update `web_base` in `index.php` to match the URL path where you're serving the example.

## Files

```
php-ssr/
├── index.php                           ← entry point (PHP)
├── swc.js                              ← re-exports SWC source (for JS side)
├── stores/
│   └── post-store.json                ← store manifest
└── components/
    ├── index.js                        ← JS entry point (Option B loading)
    └── blog-post/
        ├── component.js
        ├── markup.html
        ├── style.css
        └── component.json
```
