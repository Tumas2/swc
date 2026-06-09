# Server-Side Rendering

Server-side rendering (SSR) means generating HTML on the server before it reaches the browser. The user sees content immediately — no blank page, no loading spinner on first visit. When JavaScript loads, it takes over seamlessly.

SWC components are designed to support this without any special client-side code. The same component that runs in the browser can be rendered on the server and hydrated on the client.

---

## How it works in SWC

SWC's SSR approach has two parts:

**1. Declarative Shadow DOM (DSD)**

Instead of `<my-card></my-card>` (an empty shell waiting for JS), the server outputs the Shadow DOM inline inside a `<template>` tag:

```html
<my-card>
    <template shadowrootmode="open">
        <link rel="stylesheet" href="/components/my-card/style.css">
        <div class="card">
            <h2>Alex</h2>
        </div>
    </template>
</my-card>
```

The browser renders this immediately, before any JavaScript runs. When JS loads and the component upgrades, it finds the Shadow DOM already in place and adopts it.

**2. Initial state injection**

The server writes the store state into the page as a JSON script tag:

```html
<script>window.__SWC_INITIAL_STATE__ = {"userStore":{"name":"Alex","loggedIn":true}};</script>
```

The JS `createStore()` function reads this on startup. The first client-side render sees the same data as the server used, so `morph()` produces a no-op — zero DOM changes, zero flicker.

---

## Implementations

| Language | Status |
| :--- | :--- |
| [PHP](php/README.md) | Available |

More implementations may be added in the future. The SSR contract is simple enough to implement in any language: render a component's `markup.html` using NanoRenderer logic, wrap it in a DSD `<template>`, and output the initial state as a script tag.

---

## Using SSR without a package

If your server language doesn't have an SWC package yet, you can still do basic SSR manually:

1. Pre-fill `<router-route>` content based on the request path (see [Router SSR](../router/README.md#ssr-compatibility))
2. Output initial state yourself:

```html
<script>
window.__SWC_INITIAL_STATE__ = <?= json_encode($your_state) ?>;
</script>
```

`createStore()` will pick it up on the client side automatically.

---

[← Router](../router/README.md) | [Next: PHP SSR →](php/README.md)
