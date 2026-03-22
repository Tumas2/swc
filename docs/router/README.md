# Router

The router is an optional add-on for client-side navigation. It is built entirely from SWC components and state — no separate router instance to configure, no history object to manage.

Add it when you want URL-driven views without a full page reload.

---

## Setup

```html
<script type="module" src="./dist/swc-router.min.js"></script>
```

Or from source, register the elements yourself. The examples use `NanoRenderRouterSwitch` so that `{{ mustache }}` expressions work in page files out of the box. If you prefer a different renderer, extend the base `RouterSwitch` class instead — see [`<router-switch>`](#router-switch) below.

```javascript
import {
    RouterContainer,
    NanoRenderRouterSwitch,
    RouterRoute,
    RouterLink,
} from './src/js/router/index.js';

customElements.define('router-container', RouterContainer);
customElements.define('router-switch', NanoRenderRouterSwitch);
customElements.define('router-route', RouterRoute);
customElements.define('router-link', RouterLink);
```

---

## Quick start

Wrap your app in `<router-container>`, define your routes inside `<router-switch>`, and use `<router-link>` for navigation. Each `<router-route>` points to an HTML file via `src=` — the content is fetched lazily when the route first activates.

```html
<router-container base-path="/my-app">
    <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
        <router-link to="/users">Users</router-link>
    </nav>

    <router-switch>
        <router-route path="/"      src="./pages/home.html"></router-route>
        <router-route path="/about" src="./pages/about.html"></router-route>
        <router-route path="/users/:id" src="./pages/user-detail.html"></router-route>
        <router-route path="/*"     src="./pages/404.html"></router-route>
    </router-switch>
</router-container>
```

Each page file is a plain HTML fragment — just markup and an optional `<style>` block, no component definition needed:

```html
<!-- pages/about.html -->
<style>
    .page { padding: 3rem 1.5rem; max-width: 680px; margin: 0 auto; }
</style>

<div class="page">
    <h1>About</h1>
    <p>Content here.</p>
</div>
```

---

## Components

### `<router-container>`

The root wrapper. Creates the router store and makes it available to all descendant router elements.

| Attribute | Description |
| :--- | :--- |
| `base-path` | The root URL path for the app (e.g. `/my-app`). Defaults to `/`. |

### `<router-switch>`

Renders the first `<router-route>` child whose path matches the current URL. Only one route is visible at a time.

Two classes are available:

| Class | Renderer | When to use |
| :--- | :--- | :--- |
| `NanoRenderRouterSwitch` | NanoRenderer | Default choice — `{{ mustache }}` expressions work in `src=` page files |
| `RouterSwitch` | Raw (no-op) | Base class — subclass and override `getRenderer()` for Handlebars or other renderers |

```javascript
// Standard — mustache works out of the box
customElements.define('router-switch', NanoRenderRouterSwitch);

// Custom renderer (e.g. Handlebars)
class HandlebarsRouterSwitch extends RouterSwitch {
    getRenderer() {
        return (template, context) => Handlebars.compile(template)(context);
    }
}
customElements.define('router-switch', HandlebarsRouterSwitch);
```

### `<router-route>`

Defines a single route. Route content is loaded from an external file via the `src` attribute.

| Attribute | Description |
| :--- | :--- |
| `path` | URL pattern to match. See [Path syntax](#path-syntax) below. |
| `src` | URL of an HTML file to fetch and render (lazy loaded on first visit, then cached). |
| `no-cache` | If present, disables caching — the file is re-fetched on every visit. |

```html
<router-route path="/about" src="./pages/about.html"></router-route>
<router-route path="/posts/:id" src="./pages/post-detail.html"></router-route>
<router-route path="/*" src="./pages/404.html"></router-route>
```

> **Inline content and SSR:** Placing HTML between the `<router-route>` tags is reserved for server-side rendering. The server outputs the matching page's HTML directly so content is visible before any JavaScript loads. When JS arrives, `morph()` reconciles the pre-rendered DOM — the result is a no-op, zero flicker. See [SSR compatibility](#ssr-compatibility) below.

### `<router-link>`

A wrapper for `<a>` tags. Intercepts clicks and updates the URL without a full page reload.

| Attribute | Description |
| :--- | :--- |
| `to` | Target relative path (e.g. `/about`). |
| `class` | CSS classes forwarded to the inner `<a>` element. |

---

## Path syntax

| Pattern | Matches |
| :--- | :--- |
| `/` | Exactly `/` |
| `/about` | Exactly `/about` |
| `/user/:id` | `/user/jane`, `/user/42` — captures `id` as a route param |
| `/docs/*` | `/docs/`, `/docs/getting-started` — prefix match |

Captured params are available as `this.state.router.params` inside any component subscribed to the router store.

---

## Route params in templates

Page HTML files loaded via `src=` are rendered through NanoRenderer, so they have access to the full template context — including route params. No JavaScript needed.

```html
<!-- pages/post-detail.html -->
<div class="page">
    <h1>Post #{{ router.params.id }}</h1>
    <p>The route matched <code>/posts/:id</code> and extracted
    <code>{{ router.params.id }}</code> from the URL.</p>
</div>
```

The `router` context key is always available in `src=` page files and maps to the current router store state (`pathname`, `params`, `loading`).

---

## Active link styling

`<router-link>` knows when its target matches the current route. When it does, the inner `<a>` element automatically receives:

- `part="link link--active"` — for styling via `::part()`
- `aria-current="page"` — for accessibility

When inactive, it has `part="link"` only.

```css
router-link::part(link) {
    text-decoration: none;
    color: inherit;
}

router-link::part(link--active) {
    font-weight: bold;
    border-bottom: 2px solid currentColor;
}
```

See [Styles — CSS Parts](../styles/README.md#styling-from-outside-css-parts) for more on this pattern.

---

## Loading state

Navigation sets `loading: true` on the router store while the next route's content is being fetched. You can subscribe to this in any component to show a spinner or skeleton.

```javascript
class LoadingBar extends StatefulElement {
    getStores() {
        return { router: routerStore };
    }

    view() {
        return this.state.router?.loading
            ? `<div class="loading-bar"></div>`
            : '';
    }
}
```

The router store state shape:

| Key | Type | Description |
| :--- | :--- | :--- |
| `pathname` | string | Current relative path (e.g. `/about`) |
| `params` | object | Captured URL params (e.g. `{ id: 'jane' }`) |
| `loading` | boolean | `true` while route content is loading |

---

## SSR compatibility

The router initialises from `window.location.pathname`, so it always starts in sync with whatever the server rendered. To avoid a loading flash on first paint, output the matching page's HTML between the `<router-route>` tags on the server. Include both `src=` (for subsequent client-side navigation) and the inline server output (for the initial load):

```php
<?php
$base_url = '/my-app';
?>
<router-container base-path="<?php echo $base_url; ?>">
    <router-switch>

        <router-route path="/" src="./pages/home.html">
            <?php if ($_SERVER['REQUEST_URI'] === "{$base_url}/") {
                echo file_get_contents(__DIR__ . '/pages/home.html');
            } ?>
        </router-route>

        <router-route path="/about" src="./pages/about.html">
            <?php if ($_SERVER['REQUEST_URI'] === "{$base_url}/about") {
                echo file_get_contents(__DIR__ . '/pages/about.html');
            } ?>
        </router-route>

        <router-route path="/*" src="./pages/404.html"></router-route>

    </router-switch>
</router-container>
```

When JS loads it matches the same route and `morph()` reconciles the DOM — the result is a no-op, zero flicker. On subsequent navigation the router fetches the `src=` file as usual.

See [`test/php-routing/`](../../test/php-routing/) for a working example.

---

[← Events](../events/README.md) | [Next: SSR →](../ssr/README.md)
