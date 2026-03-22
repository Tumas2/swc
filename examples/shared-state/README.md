# Shared State

**What it shows:** Two components sharing one store. A favourite button appears at the top
and bottom of an article. Clicking either one updates both instantly — no events, no
callbacks between them.

## Key concepts

- `createStore()` — creates a named store with default state
- `getStores()` — subscribes the component; re-renders on every change
- Shared module (`components/stores.js`) — ensures both components reference the exact same
  store instance

## How to run

Serve the folder from any local HTTP server and open `index.html`. Example with the PHP
built-in server:

```bash
php -S localhost:8080
```

Then visit `http://localhost:8080`.

## Files

```
shared-state/
├── index.html
├── swc.js                              ← re-exports SWC source
├── stores/
│   └── article-store.json             ← store name + default state
└── components/
    ├── stores.js                       ← creates + exports the store instance
    ├── index.js                        ← entry point (imports stores, then components)
    └── fav-button/
        ├── component.js
        ├── markup.html
        ├── style.css
        └── component.json
```
