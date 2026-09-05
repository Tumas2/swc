# Local-First Sync

A design document for adding optional remote sync to swc stores.

---

## Goal

Build local-first web apps using standard web components and web technologies. Data lives on the client and works fully offline. The moment connectivity is restored, changes sync to a remote backend automatically.

---

## Hosting modes

The platform is designed to run in three distinct modes. These are not mutually exclusive — the same codebase supports all three, the difference is configuration and what's available at runtime.

---

### Mode 1 — Single device, service worker available (HTTPS required)

localStorage is the database. `persistStore` keeps state across reloads. The service worker acts as a caching proxy for external API calls (AniList, weather, etc.) with TTL-based caching and stale fallback when offline. Because the service worker is shared across all tabs for the same origin, multiple open tabs make only one external API request between them rather than each tab fetching independently. No server needed.

Best for: one person, one device, full offline support, no infrastructure to maintain.

---

### Mode 2 — Single device, no service worker (HTTP, no HTTPS)

Same as Mode 1 but without HTTPS, so the service worker cannot register. External API fetch logic runs directly in the component instead of through `swRequest`. No caching between page loads, but the core app works identically. The fetch functions that back each `swRequest` handler are the same functions — they just get called directly rather than through the service worker.

This means the service worker is an optional enhancement, not a hard dependency. Every handler that exists in a `fetch.sw.js` file should also be callable directly for this fallback path.

**Planned implementation**: a shared `fetchers/` folder holds the actual fetch logic (one file per data source — `fetchers/anime.js`, `fetchers/weather.js`, etc.). A config file declares where each fetcher runs: `'direct'` (called inline in the component), `'service-worker'` (routed through `swRequest`), or `'server'` (called as a server endpoint). The request wrapper reads this config and routes accordingly — the fetcher function itself is written once and works in all three modes.

Best for: self-hosting on a local network without HTTPS, Raspberry Pi, shared household server on plain HTTP.

---

### Mode 3 — Central server

The server handles everything: external API proxying and caching (AniList, weather), data persistence (SQLite), and sync. Clients make regular fetch calls to the server — no service worker involved. HTTP is sufficient. All devices in the household share the same cached API data, so one fetch from the server serves everyone rather than each device calling the external API independently.

`syncStore` points at the server for push/pull. External API calls go to server endpoints instead of directly to third-party APIs. The server caches those responses in its own database.

The sync server URL is configurable per device and stored in localStorage, so the same frontend can point at different backends (home Pi, a friend's Pi, etc.).

Best for: multiple devices in a household, shared data, no HTTPS requirement, better offline resilience (server holds cached data even if a device clears localStorage).

---

## Persistence layers

Two separate, stackable utilities:

**`persistStore(store, key)`** — survives page reloads. Writes full state to `localStorage` under `swc:<key>` on every `setState`. Reads it back on page load. This is the offline baseline — the app always starts with the last known state, instantly, with no network.

**`syncStore(store, config)`** — moves data between devices and backends. Calls user-provided `push` and `pull` functions at the right moments and applies the result via `setState`. `persistStore` then immediately saves whatever comes back to `localStorage`.

Stacking them:

```js
const store = createStore(meta);
persistStore(store, 'todos');
syncStore(store, { push, pull, onBeforeSync });
```

On startup: `persistStore` rehydrates from `localStorage` first, before `syncStore` fires its initial pull. This avoids a blank-state flicker.

---

## `syncStore` API

```js
syncStore(store, {
  push: async (state) => { /* send data somewhere — fetch, Supabase, IndexedDB, anything */ },
  pull: async (state, lastSyncTimestamp) => { /* fetch remote data, return raw result */ },
  onBeforeSync: (localState, remoteData) => mergedState, // optional
  onSyncError: (err) => {},                              // optional
});
```

The library's only responsibilities:

- Call `push(state)` when the store is dirty and the device is online
- Call `pull(state, lastSyncTimestamp)` on connect and on page load
- If `onBeforeSync` is provided, pass local state and the raw pull result through it before calling `setState`; otherwise call `setState` with the pull result directly
- Track `lastSyncTimestamp` in `localStorage`
- Listen to `online`/`offline` events to know when to fire

Everything about *how* data moves, what the backend looks like, conflict resolution, and data shape is the caller's problem. The library stays ignorant.

### Why push/pull as plain functions

The caller might use a REST API, Supabase, the browser's origin-private file system, IndexedDB, or anything else. Accepting a config object with an endpoint URL would force a transport. Plain async functions don't.

### `onBeforeSync`

Separates fetching from merging. Without it, `pull` must do both. With it:

- `pull` fetches and returns raw remote data
- `onBeforeSync` receives `(localState, remoteData)` and returns the merged state

This is where the caller handles offline conflicts — comparing timestamps, picking a winner, prompting the user, or anything else. It runs between the pull result arriving and `setState` being called.

---

## Conflict resolution

`syncStore` has no opinion on conflicts. That belongs in `onBeforeSync` (or inside `pull` if the caller prefers).

Common strategies the caller can implement:

- **Last write wins** — compare `updated_at` timestamps, highest wins. Simple and correct for single-user apps where the same record is rarely edited on two devices simultaneously.
- **Delete wins** — if a record has a `deleted` flag, treat it as deleted regardless of other field timestamps.
- **Per-field timestamps** — each field tracks its own `updated_at`. Merge picks the newest value per field. Handles the "updated title on laptop + marked done on phone" case.

### Soft deletes

Hard-deleting a record on one device means the sync engine has nothing to pull — the server can't propagate a deletion it doesn't know about. Soft deletes (a `deleted` flag or `deleted_at` timestamp) give the server something to return so all clients can act on it.

Recommended split:

- **Server**: soft-deleted rows stay forever. Storage is cheap; this also enables audit trails and undo.
- **Client**: after a successful sync, prune rows where `deleted = true` from `localStorage`. The client only needs the live working set.

If a client goes offline, prunes deleted rows, comes back online later, and pulls — the server returns those rows as `deleted = true`, the client applies the deletion to state, and prunes them again. No data is lost.

---

## Service worker integration

The existing service worker handler pattern (`swRequest` + named handlers registered in `sw.js`) fits sync naturally.

The service worker becomes the sync coordinator: it owns `lastSyncTimestamp`, runs push/pull logic in the background, resolves conflicts via an `onBeforeSync` equivalent, and posts the merged state back to the client via `postMessage`. The client just receives clean state and calls `setState`.

This also enables the browser's Background Sync API — the SW can fire a sync even when no tab is open, pushing queued local changes the moment connectivity returns.

A `sync.sw.js` file per app would register its handler the same way `fetch.sw.js` files already do:

```js
// sync.sw.js
export default [{
  name: 'todos:sync',
  async handle({ lastSyncTimestamp, state }) {
    // push + pull + merge logic here
    return mergedState;
  }
}];
```

Client side:

```js
syncStore(store, {
  push: (state) => swRequest('todos:sync', { state, lastSyncTimestamp }),
  pull: (state, lastSyncTimestamp) => swRequest('todos:sync', { state, lastSyncTimestamp }),
});
```

Or combined into a single handler call that does both and returns merged state, skipping `onBeforeSync` entirely — the SW handles it.

---

## What this is not

`syncStore` is not opinionated about:

- Backend technology (REST, Supabase, SQLite, IndexedDB, anything)
- Data shape or table structure
- Conflict resolution strategy
- Whether offline edits are allowed at all (a caller can ignore `push` entirely and just blow away local state on every pull)

It is a thin orchestration layer: dirty tracking, online detection, timestamp bookkeeping, and calling the right functions at the right time.

---

## Multi-user profiles and data visibility (architecture TBD)

This section captures thinking done so far. The architecture will be decided once more widgets are built and we can look at the full picture of what needs to be shared, by whom, and at what granularity.

### Profile model

Each family member has a profile — a name, a UUID as their permanent `user_id`, and a hashed PIN (SHA-256, done in the browser via Web Crypto API) stored in `localStorage`. On app load, if no active profile is in `sessionStorage`, a profile picker is shown. Selecting a profile and entering the correct PIN writes the `user_id` to `sessionStorage` for the duration of the session.

The `user_id` is passed into all push/pull calls so the server can scope data per person. This is convenience separation for a home server, not security — someone with dev tools access can bypass it.

### Data visibility

By default, all data is private to the profile that created it. A `public` flag makes data readable by any other profile on the same server.

The `public` flag lives in a **separate visibility table on the server**, not on the data rows themselves. Storing it on rows would mean updating thousands of records every time a user changes their visibility preference. A single row in a visibility table controls all records of a given resource with one write.

Proposed shape:

```
{ user_id, table_name, resource_id, public }
```

When pulling, the server returns:
- All rows owned by the requesting `user_id`
- All rows owned by other users where a matching visibility entry has `public = true`

Each returned row carries the original `user_id`, so the client knows who it belongs to (useful for widgets that display multiple people's data side by side).

### Visibility granularity is app-level

How granular visibility gets depends on the app's data model:

- **Simple apps** (calories, steps, a single list) — the whole table is the resource. One visibility entry controls everything. `resource_id` could be the table name itself or just `*`.
- **Multi-entity apps** (notebooks, todo lists with multiple lists) — each entity is its own resource. One visibility entry per notebook or list. A user can share notebook #3 without exposing #1 and #2.

The sync engine provides the mechanism. Each app decides how granular to be.

### Why this is deferred

The right architecture here depends on what the actual widgets look like — how they model their data, what the natural "shareable unit" is, and what family-facing use cases actually emerge. Building more widgets first, then designing the visibility layer across all of them at once, will produce a better result than designing it in the abstract now.

---

## Device-to-device import (experimental — not being worked on yet)

This is an early thought, not a planned feature. Nothing here is decided.

One interesting use case that doesn't fit the server-based sync model: you've made changes on your phone while traveling and want your laptop to have exactly that state — no merging, no conflict resolution, just "give me what you have."

WebRTC could handle this as a one-shot, user-initiated action rather than automatic background sync:

1. Phone generates a connection offer, displays it as a QR code
2. Laptop scans it, WebRTC data channel opens
3. Phone sends its full store state as a JSON blob
4. Laptop calls `setState` with it, `persistStore` saves it to localStorage
5. Connection closes

This avoids all the complexity that makes persistent WebRTC sync hard — no distributed authority, no conflict resolution, no persistent connection. It's a deliberate one-directional overwrite the user explicitly triggers, so intent is unambiguous.

It would live as a separate `importFromDevice()` utility, not part of `syncStore`. The user consciously chooses to blow away local state, so it has nothing to do with the automatic sync flow.

The signaling step (exchanging the connection offer) still requires some out-of-band channel. A QR code is the most self-contained option — no server needed at all for the handshake. For devices without a camera, alternatives include:

- A short alphanumeric code the user types manually
- Copy-paste the offer string between devices (via a notes app, messaging yourself, etc.)
- Encode the offer as a URL — clicking it on the other device opens the app and completes the handshake

Web Bluetooth was considered as an alternative pairing channel but ruled out — browsers cannot advertise themselves as Bluetooth peripherals, so two browsers cannot discover each other directly. A native helper app would be required on one side, which defeats the pure web goal.

For networks where WebRTC hole-punching fails (strict firewalls), a TURN relay server would be needed as a fallback, which reintroduces a server dependency.

Worth revisiting once the core sync layer is built and working.
