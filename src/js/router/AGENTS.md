# SWC Router - AI Context & Documentation

## Overview
The `src/router` module provides a declarative, component-based client-side routing system for SWC applications. It mimics standard routing patterns (like React Router) but uses custom elements and the core SWC state management system.

## Architecture

### 1. State Management (`RouterStore`)
- **Central Brain**: `RouterStore` manages `pathname` and `params`.
- **History**: Wraps `window.history.pushState` and listens to `popstate`.
- **Matching**: logic includes strict matching, prefix matching (wildcards `*`), and parameter extraction (`:id`).

### 2. Context Provider (`RouterContainer`)
- **Role**: Initializes the `RouterStore` with a `base-path`.
- **Dependency Injection**: It acts as the "Store Provider". Descendant components finder this instance via `_findStoreProvider()` to access the store.

### 3. View Management (`RouterSwitch`)
- **Registration**: Scans its `<router-route>` children to register valid paths with the store.
- **Rendering**: 
    - Subscribes to the router store.
    - On state change/initial load, it finds the first matching route.
    - **Lazy Loading**: If the matched route has a `src` attribute, it fetches the HTML content (caching by default unless `no-cache` is set) and injects it.
    - **Reactivity**: It handles the complexities of replacing DOM nodes while trying to preserve focus where possible.

## Components API

### `<router-container>`
Top-level wrapper.
- **Attributes**:
    - `base-path`: (string) The root URL path for the app (e.g., `/app/`). Defaults to `/`.

### `<router-switch>`
Renders **exactly one** route at a time (exclusive match).
- **Behavior**: Iterates through children, finds the first match, and renders it.

### `<router-route>`
Defines a specific route.
- **Attributes**:
    - `path`: (string) The URL pattern to match.
        - `/`: Root match.
        - `/about`: Exact match.
        - `/users/*`: Wildcard prefix match.
        - `/post/:id`: Parameter match.
    - `src`: (string, optional) URL to an HTML file to load asynchronously.
    - `no-cache`: (boolean) If present, disables caching for `src` content.
    - `element`: (string, optional) Tag name of a custom element to serve as the route view.

### `<router-link>`
A semantic anchor tag wrapper for internal navigation.
- **Attributes**:
    - `to`: (string) The target relative path.
    - `class`: (string) CSS classes to apply to the inner `<a>` tag.
- **Behavior**: Intercepts `click` events to call `store.navigate()`, preventing full page reloads.

## Usage Example

```html
<!-- Base setup -->
<router-container base-path="/app">
    <header>
        <nav>
            <router-link to="/">Home</router-link>
            <router-link to="/about">About</router-link>
        </nav>
    </header>

    <main>
        <router-switch>
            <!-- Inline Content -->
            <router-route path="/">
                <home-page></home-page>
            </router-route>

            <!-- Lazy Loaded External Content -->
            <router-route path="/about" src="./parts/about.html"></router-route>

            <!-- Parameterized Route -->
            <router-route path="/user/:json" src="./parts/user-profile.html"></router-route>

            <!-- 404 Fallback -->
            <router-route path="/*">
                <h1>Not Found</h1>
            </router-route>
        </router-switch>
    </main>
</router-container>
```

## Server-Side Rendering (SSR) Compatibility
As mentioned in the main `AGENTS.md`, this router is SSR-friendly.
- The server can pre-fill a `<router-route>` with content based on the request URI.
- The `RouterStore` initializes with the current `window.location.pathname`, so client-side state syncs with the server-rendered view immediately.

## Setup Requirements

### `<base>` tag — required when using `src=` on any route

`<router-route src="...">` uses `fetch()` to load HTML. `fetch()` resolves relative URLs against `document.baseURI`. After `history.pushState`, `document.baseURI` changes to the new path — so a relative path like `./pages/home.html` silently fetches the wrong URL (404) on any route that adds a URL segment.

**Fix**: add `<base href="/my-app/">` to `<head>`. This pins `document.baseURI` to a constant value for the entire page lifetime. `fetch()` respects the `<base>` tag natively — no router code changes are needed.

```html
<head>
    <base href="/my-app/">
</head>
```

The `href` must match the `base-path` attribute on `<router-container>` (with a trailing slash).

> Routes that use only inline content (no `src=`) are unaffected and do not require `<base>`.

### Server-side catch-all — required for hard-reload on deep routes

`history.pushState` changes the browser URL without a server round-trip, so client-side navigation works regardless of server config. But a **hard reload** (F5, direct link) at a sub-path like `/my-app/posts/1` sends that path to the server, which returns 404 unless it is configured to serve `index.html` for all app routes.

**Apache** (`.htaccess` in the app root):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /my-app/index.html [L]
```

**Nginx**:
```nginx
location /my-app/ {
    try_files $uri /my-app/index.html;
}
```
