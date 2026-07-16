# Sync

`syncStore` is an optional utility that wires a store to a remote data source. It is transport-agnostic — it does not know or care whether your backend is a REST API, Supabase, a home server, or anything else. You provide two functions that describe how data moves; the library handles when they fire.

Like `persistStore` and the router, sync is opt-in. You only pay for it if you use it.

---

## The goal: local-first apps

A local-first app renders immediately from local state, works fully offline, and syncs with a remote source whenever it has connectivity. The user never waits for a network round-trip to see or interact with their data.

SWC's approach to this is layered:

| Layer | Tool | Responsibility |
|---|---|---|
| Survive page reloads | `persistStore` | Write state to localStorage on every change |
| Survive offline | `persistStore` | Restore from localStorage on load so the app is immediately usable |
| Sync with remote | `syncStore` | Push local changes and pull remote changes when online |

The two utilities compose — a store can use both. `persistStore` ensures the app works without a network. `syncStore` enriches it when a network exists.

---

## API

```javascript
import { syncStore } from './swc.js';

syncStore(store, {
    push: async (state) => {
        // Send local data to your backend. Return value is ignored.
    },
    pull: async (state, lastSyncTimestamp) => {
        // Fetch remote data and return the new merged state.
        return newState;
    },
    onBeforeSync: (localState, remoteState) => {
        // Optional. Called between pull returning and setState being applied.
        // Inspect both sides and return the state you want committed.
        return mergedState;
    },
});
```

### `push(state)`

Called when the store is dirty and the browser is online. Receives the full current store state. The library does not dictate what you extract or where you send it — that is entirely your implementation.

### `pull(state, lastSyncTimestamp)`

Called on startup and whenever the browser comes back online. Receives the current local state and the timestamp of the last successful sync (milliseconds since epoch, `0` on first run). Returns the new state to apply. Returning `null` or `undefined` skips the state update.

`lastSyncTimestamp` is stored in `localStorage` under `swc-sync:<storeId>` and updated automatically after each successful sync.

### `onBeforeSync(localState, remoteState)` _(optional)_

An escape hatch for conflict resolution. Without it, `pull` is responsible for both fetching and merging. With it, `pull` can return raw remote data and delegate the merge decision to `onBeforeSync`. This is the right place to handle cases like: the user has been offline for a week and you want to show a prompt, run a custom merge strategy, or log a conflict before committing.

If omitted, whatever `pull` returns is applied directly.

---

## Composing with `persistStore`

Stack them in this order — persist first, sync second:

```javascript
const store = createStore(meta);
persistStore(store, 'todos');
syncStore(store, { push, pull });
```

On page load:
1. `persistStore` rehydrates from localStorage immediately — the app is usable with no network.
2. `syncStore` fires its first pull — remote changes merge in as soon as they arrive.

`syncStore` applies its merged state via `setState`, which `persistStore` intercepts and saves to localStorage. They do not conflict.

---

## Connectivity handling

`syncStore` listens to the browser's `online` and `offline` events. When the browser reports it is online:

1. Pending dirty state is pushed.
2. A pull is performed and the result is applied.
3. `lastSyncTimestamp` is updated.

While offline, `push` and `pull` are not called. Changes made offline remain in localStorage via `persistStore` and are pushed on the next successful connection.

---

## Service worker pattern

For background sync — syncing even when the tab is not active — the push/pull logic can live in a service worker. SWC already has a named-handler system for this (`swRequest`).

Define your sync logic in a `sync.sw.js` file:

```javascript
// sync.sw.js
export default [{
    name: 'todos:sync',
    ttl: 0,
    async handle({ state, lastSyncTimestamp }) {
        // push, pull, merge — all in the service worker
        return mergedState;
    }
}];
```

Register it in your `sw.js` alongside other handlers, then point `syncStore` at it:

```javascript
syncStore(store, {
    push: async (state) => {
        await swRequest('todos:sync', { state, direction: 'push' });
    },
    pull: async (state, lastSyncTimestamp) => {
        return swRequest('todos:sync', { state, lastSyncTimestamp, direction: 'pull' });
    },
});
```

The browser's [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) (`sync` event) can extend this further — the service worker can fire a sync the moment connectivity returns, even if no tab is open.

---

## Implementation notes for callers

`syncStore` is deliberately ignorant of your data model. The following are not library concerns — they are decisions your `push` and `pull` implementations make.

### Conflict resolution

When the same record is edited on two devices while both are offline, one edit will arrive after the other. The simplest policy — and one that works well for single-user apps — is **last write wins**: whichever record has the higher `updated_at` timestamp is kept. This is straightforward to implement in both the client pull and the server upsert.

For finer control, `onBeforeSync` lets you inspect both local and remote state before committing, so you can implement per-field merge logic or surface a conflict to the user.

### Soft deletes

If your app needs to propagate deletions across devices, hard-deleting records is not enough — a missing row is invisible to the sync engine. Use soft deletes instead: add a `deleted_at` field (or a `deleted` boolean + `updated_at`) and filter deleted records out of the UI. The server keeps deleted rows permanently so any device that syncs later receives the deletion. The client can prune soft-deleted rows from localStorage after a successful sync to keep local storage lean.

### "Blow and replace" strategy

If you do not need offline writes — you just want local state to stay warm and always reflect the server — your `pull` can ignore `lastSyncTimestamp` entirely and return a fresh snapshot each time:

```javascript
pull: async () => {
    const res = await fetch('/api/todos');
    return res.json();
},
push: async () => {}, // no-op
```

The library does not enforce a strategy. Use whatever fits your app.

---

[← State](../state/README.md)
