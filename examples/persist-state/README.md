# Persist State

**What it shows:** Store state saved to `localStorage` and restored on the next page load.

Add books to the reading list, then refresh the page — the list is still there. "Clear all"
calls `resetState()`, which removes the localStorage entry so the next load starts fresh.

## Key concepts

- `"persist": true` in `store.json` — no extra code needed, `createStore()` wires it automatically
- SSR state (if present) always takes precedence over localStorage on first load
- `resetState()` clears both in-memory state and the localStorage entry
- State is stored under the key `swc:<id>` (`swc:readingListStore` here)

## How to run

```bash
php -S localhost:8080
```

Open `http://localhost:8080`.

## Files

```
persist-state/
├── index.html
├── swc.js
├── stores/
│   └── reading-list-store.json    ← persist: true lives here
└── components/
    ├── stores.js
    ├── index.js
    └── reading-list/              ← getManifest() for auto-wiring, $addItem, $clearAll
```
