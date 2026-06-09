# SWC Router

A declarative, component-based router module for the SWC library. It provides client-side routing with nested routes, lazy loading, and full server-side rendering (SSR) compatibility.

## Features

-   **Declarative Syntax**: Use `<router-route>` and `<router-switch>` to define your app structure.
-   **Lazy Loading**: Fetch HTML content on demand with the `src` attribute.
-   **Nested Routes**: Compose complex UIs easily.
-   **Parameters**: Support for dynamic paths like `/user/:id` and wildcards `/*`.
-   **No "Pop-in"**: Fully compatible with SSR for instant initial renders.

## Installation

This is an optional utility for the SWC library. Ensure you have the core `StatefulElement` and `store` files available.

## Components

| Component | Description |
| :--- | :--- |
| `<router-container>` | The root component. Initializes the router store and history listener. |
| `<router-switch>` | Renders the *first* matching route from its children. |
| `<router-route>` | Defines a path and the content to show (inline or external). |
| `<router-link>` | A wrapper for `<a>` tags to handle navigation without page reloads. |

## Quick Start

```html
<script type="module" src="./src/router/index.js"></script>

<router-container base-path="/my-app">
    <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
    </nav>

    <router-switch>
        <!-- Inline Route -->
        <router-route path="/">
            <h1>Home Page</h1>
        </router-route>

        <!-- Lazy Loaded Route -->
        <router-route path="/about" src="./parts/about.html"></router-route>

        <!-- Catch-all (404) -->
        <router-route path="/*">
            <h1>404 Not Found</h1>
        </router-route>
    </router-switch>
</router-container>
```

## Requirements

### `<base>` tag (required when using `src=`)

If any `<router-route>` uses the `src` attribute to lazy-load external HTML, add a `<base>` tag to your `<head>` that points to the app root:

```html
<head>
    <base href="/my-app/">
</head>
```

Without this, relative `src` paths are resolved against `document.baseURI`, which changes after every `history.pushState`. For example, navigating to `/my-app/posts/1` makes `src="./pages/home.html"` resolve to `/my-app/posts/pages/home.html` (404) instead of `/my-app/pages/home.html`.

The `<base>` tag pins `document.baseURI` to a fixed value for the entire page lifetime so all relative fetches resolve correctly. This is standard SPA practice — Angular requires the same setup.

### Server-side catch-all

For hard-reloads to work on deep routes (e.g. refreshing `/my-app/posts/1`), your server must serve `index.html` for all paths under `base-path`. Without this, a direct visit to a sub-path returns a server 404 before the SPA loads.

**Apache** (`.htaccess`):
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /my-app/index.html [L]
```

## Documentation

For detailed architecture and API documentation, see `AGENTS.md` in this directory.
