# Router

A declarative client-side routing module built on SWC's component and state system. It is an optional add-on — the core library does not depend on it.

## Setup

```html
<script type="module" src="./src/js/router/index.js"></script>
```

Or import and register manually:

```javascript
import './src/js/router/index.js';
```

---

## Quick Start

```html
<router-container base-path="/my-app">
    <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
    </nav>

    <router-switch>
        <router-route path="/">
            <h1>Home</h1>
        </router-route>

        <router-route path="/about" src="./pages/about.html"></router-route>

        <router-route path="/*">
            <h1>404 Not Found</h1>
        </router-route>
    </router-switch>
</router-container>
```

---

## Components

### `<router-container>`

The root wrapper. Creates the `RouterStore` and makes it available to all descendant router components.

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `base-path` | string | `/` | The root URL path for the app (e.g. `/my-app/`) |

### `<router-switch>`

Renders the **first** matching `<router-route>` child. Only one route is visible at a time.

### `<router-route>`

Defines a path and the content to display.

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `path` | string | URL pattern to match (see [Path Syntax](#path-syntax)) |
| `src` | string | URL of an HTML file to fetch and render (lazy loaded) |
| `no-cache` | boolean | Disable caching when using `src` |

Content can be inline HTML or externally loaded via `src`:

```html
<!-- Inline -->
<router-route path="/about">
    <h1>About</h1>
</router-route>

<!-- Lazy loaded -->
<router-route path="/about" src="./pages/about.html"></router-route>
```

### `<router-link>`

A wrapper for `<a>` tags that intercepts clicks and calls `store.navigate()` — no full page reload.

| Attribute | Type | Description |
| :--- | :--- | :--- |
| `to` | string | Target relative path (e.g. `/about`) |
| `class` | string | CSS classes forwarded to the inner `<a>` element |

---

## Path Syntax

| Pattern | Matches |
| :--- | :--- |
| `/` | Exactly `/` |
| `/about` | Exactly `/about` |
| `/user/:id` | `/user/jane`, `/user/42` — captures `id` as a param |
| `/docs/*` | `/docs/`, `/docs/intro/setup` — prefix match |

Captured params are available as `this.state.router.params`:

```javascript
// For path="/user/:id", navigating to /user/jane:
this.state.router.params.id  // → "jane"
```

---

## Active Link Styling

`<router-link>` automatically detects when its `to` path matches the current route. When active, the inner `<a>` element receives:

- `part="link link--active"` — style from outside the shadow DOM using `::part()`
- `aria-current="page"` — accessible current-page indicator

When inactive, the `<a>` has `part="link"` only and no `aria-current`.

### Styling with `::part()`

```css
/* Target any router-link */
router-link::part(link) {
    color: inherit;
    text-decoration: none;
}

/* Target only the active link */
router-link::part(link--active) {
    font-weight: bold;
    color: var(--accent-color);
    border-bottom: 2px solid currentColor;
}
```

---

## Loading State

The `RouterStore` exposes a `loading` flag in its reactive state. It is `true` from the moment navigation starts until the route content has finished rendering.

```javascript
// Inside any component subscribed to the router store:
this.state.router.loading  // boolean
```

Example — show a spinner during navigation:

```javascript
getStores() {
    return { router: routerStore };
}

view() {
    if (this.state.router?.loading) {
        return `<div class="spinner"></div>`;
    }
    return `<slot></slot>`;
}
```

---

## RouterStore State Shape

| Key | Type | Description |
| :--- | :--- | :--- |
| `pathname` | string | Current relative path (e.g. `/about`) |
| `params` | object | Captured URL parameters (e.g. `{ id: "jane" }`) |
| `loading` | boolean | `true` while route content is being fetched/rendered |

---

## SSR Compatibility

`RouterStore` initialises from `window.location.pathname`, so the client state always matches what the server rendered. Pre-fill `<router-route>` content server-side to avoid a loading flash on first paint:

```php
<router-switch>
    <router-route path="/" src="./pages/home.html">
        <?php if ($request_path === '/') echo file_get_contents(__DIR__ . '/pages/home.html'); ?>
    </router-route>

    <router-route path="/about" src="./pages/about.html">
        <?php if ($request_path === '/about') echo file_get_contents(__DIR__ . '/pages/about.html'); ?>
    </router-route>
</router-switch>
```

The server fills in the matching route's content. On load, the JS router sees the correct pathname, matches the same route, and `morph()` makes the re-render a no-op — zero flicker.
