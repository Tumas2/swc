# Router

**What it shows:** Client-side SPA routing. Navigate between pages without a full reload.
Active links are styled via CSS `::part(link--active)`. The Posts detail page reads a
`:id` param from the router store.

## Key concepts

- `<router-container>` — wraps everything; creates and owns the `RouterStore`
- `<router-link to="...">` — intercepts clicks, calls `store.navigate()`
- `<router-switch>` — renders the first matching `<router-route>`'s content
- `<router-route path="...">` — defines a route; supports params like `/posts/:id`
- `::part(link--active)` — CSS hook for styling the active link from outside the shadow DOM
- `_findStoreProvider()` — utility to locate the nearest ancestor with a store (used by
  `post-detail` to read route params without importing the store directly)

## How to run

Serve the folder from any local HTTP server:

```bash
php -S localhost:8080
```

Then visit `http://localhost:8080`. The included `.htaccess` rewrites all unknown paths to
`index.html`, so refreshing on a deep URL (e.g. `/posts/1`) works out of the box on Apache.

## Files

```
router/
├── index.html
├── .htaccess               ← rewrites deep URLs to index.html (Apache)
├── swc.js                  ← re-exports SWC + registers router custom elements
├── pages/
│   ├── home.html           ← loaded via src= on router-route
│   ├── about.html
│   ├── posts.html          ← links to /posts/:id routes
│   └── post-detail.html    ← uses {{ router.params.id }} from template context
└── components/
    ├── index.js
    └── app-nav/            ← persistent nav bar with router-link items
```
