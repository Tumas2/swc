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

## Documentation

For detailed architecture and API documentation, see `AGENTS.md` in this directory.
