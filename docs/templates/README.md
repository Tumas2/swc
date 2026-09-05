# Templates

A template is the HTML a component renders. SWC gives you two ways to define it and two ways to process it — mix and match based on what your component needs.

---

## Inline with `view()`

The simplest approach: return an HTML string directly from the `view()` method. Standard JavaScript template literals work as-is, so you can interpolate `${this.state.*}` directly.

```javascript
class UserCard extends StatefulElement {
    getStores() {
        return { user: userStore };
    }

    view() {
        const { name, role } = this.state.user;
        return `
            <div class="card">
                <h2>${name}</h2>
                <p>${role}</p>
            </div>
        `;
    }
}
```

This works well for small templates. It keeps everything in one file and is easy to read at a glance.

---

## External file with `getTemplatePath()`

For larger templates, keep the HTML in a separate `markup.html` file and point to it from `getTemplatePath()`. SWC fetches it once and caches it for the lifetime of the page.

```javascript
class UserCard extends StatefulElement {
    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}
```

```html
<!-- markup.html -->
<div class="card">
    <h2></h2>
    <p></p>
</div>
```

On its own, a raw external template can't interpolate data — you'd need to handle that yourself in `render()`. The real value of `getTemplatePath()` is pairing it with a renderer via `getRenderer()`, which processes the template string before it hits the DOM. NanoRenderer is the built-in option, but any function with the signature `(template, context) => string` works.

---

## NanoRenderer — `{{ mustache }}` syntax

NanoRenderer is an optional built-in template engine. It adds `{{ mustache }}`-style syntax to your templates, handling interpolation, conditionals, and loops without any extra dependencies.

The syntax is heavily inspired by [Handlebars.js](https://handlebarsjs.com/), but NanoRenderer is a purpose-built subset — just enough to cover the common cases. Using Handlebars directly would introduce an external dependency and pull in far more than a component library needs. NanoRenderer keeps the familiar syntax while staying within SWC's zero-dependency goal.

> **The renderer slot is open.** `getRenderer()` accepts any function with the signature `(template, context) => string`. NanoRenderer is the batteries-included option, but you could plug in Handlebars, Mustache, or anything else instead — see [Project-wide setup](#project-wide-setup) for how.

### Setup

The quickest way is to extend `NanoRenderStatefulElement` instead of `StatefulElement`:

```javascript
import { NanoRenderStatefulElement } from './src/js/NanoRenderer.js';

class UserCard extends NanoRenderStatefulElement {
    getStores() {
        return { user: userStore };
    }

    getTemplatePath() {
        return new URL('./markup.html', import.meta.url).pathname;
    }
}
```

```html
<!-- markup.html -->
<div class="card">
    <h2>{{ user.name }}</h2>
    <p>{{ user.role }}</p>
</div>
```

Now data flows from the store into the template automatically on every render.

You can also use NanoRenderer with inline `view()` — just use `{{ }}` syntax in the returned string instead of `${}`.

### Template context

Templates receive the merged state from all stores (keyed by their store name) plus anything returned from `computed()`. Access values by dot path:

```
{{ user.name }}          ← from getStores() { return { user: ... } }
{{ fullName }}           ← from computed() { return { fullName: ... } }
```

### Syntax reference

**Interpolation**

```html
{{ user.name }}                     — safe (HTML-escaped)
{{{ user.bio }}}                    — raw HTML (use only with trusted data)
{{ user.status || "Offline" }}      — fallback value
```

**Conditionals**

```html
{{#if user.loggedIn}}
    <p>Welcome back, {{ user.name }}!</p>
{{else}}
    <p>Please log in.</p>
{{/if}}
```

**Loops**

Iterates over an array. Inside the block, use `{{ this.property }}` for the current item and `{{ index }}` for the zero-based position.

```html
<ul>
    {{#each cart.items}}
        <li>{{ this.name }} — ${{ this.price }}</li>
    {{/each}}
</ul>
```

### Keeping identity with `key`

Rendering updates the DOM in place rather than replacing it, and by default
elements are matched **by position**. That is right for stable markup, but wrong
the moment a child moves — a list reorders, or a conditional block above it
appears. The element sitting in that position is then reused for different data,
or replaced outright.

For plain markup that is harmless. For anything holding state it is not: a
focused input, a playing video, or a nested component with its own shadow root
and store subscriptions.

Add a `key` attribute and the element is matched by identity instead, then moved
into place rather than replaced:

```html
{{#each tabs}}
    <tab-panel key="{{ this.id }}" label="{{ this.label }}"></tab-panel>
{{/each}}
```

Use a value that identifies the item, not its position — a record id works,
`{{ index }}` defeats the purpose. Keys only need to be unique among siblings.

Reach for it when a list can reorder, when items can be inserted or removed from
anywhere but the end, or when the children are components. A fixed list that only
ever appends does not need keys.

### Partials

When a template file grows large, you can split it into smaller files and pull them in with `{{#html './path.html'}}`. SWC replaces each tag with the content of the referenced file before the template is compiled.

```html
<!-- markup.html -->
<div class="card">
    {{#html './partials/header.html'}}
    <hr>
    {{#html './partials/bio.html'}}
</div>
```

```html
<!-- partials/header.html -->
<div class="header">
    <strong>{{ user.name }}</strong>
    {{#if user.online}}
        <span class="badge">Online</span>
    {{else}}
        <span class="badge away">Away</span>
    {{/if}}
</div>
```

A few things to know:

- **Paths are relative to the including file.** A partial inside `components/card/markup.html` resolves `./partials/bio.html` as `components/card/partials/bio.html`.
- **Partials share the full template context.** Every partial receives the same merged state and computed values as the parent template — no extra wiring needed.
- **Partials can include other partials.** Resolution is recursive, so a partial can itself use `{{#html '...'}}`.
- **Loading happens once.** Partials are fetched and inlined at component mount time. The fully-resolved template is then compiled and cached by NanoRenderer like any other template.

> **Partials only work with file-based templates** (via `getTemplatePath()`). Inline `view()` strings have no file path to resolve against.

---

### Project-wide setup

If you want all your components to use NanoRenderer without extending `NanoRenderStatefulElement` every time, create a shared base class:

```javascript
// swc.js — your project's base class
import { StatefulElement } from './src/js/StatefulElement.js';
import { NanoRenderer } from './src/js/NanoRenderer.js';

const nano = new NanoRenderer();

export class AppElement extends StatefulElement {
    getRenderer() {
        return nano.render;
    }
}
```

```javascript
// my-component/component.js
import { AppElement } from '../../swc.js';

class MyComponent extends AppElement {
    // {{ mustache }} works in view() and markup.html
}
```

The base class is also the right place to expose global values to every template. A common need is a base URL for assets — set it on `window` before your modules load, then return it from `computed()` so it is available in all templates:

```html
<!-- index.html — set before the module script -->
<script>window.base_url = 'https://example.com/assets';</script>
<script type="module" src="/app.js"></script>
```

```javascript
// swc.js — expose it in every component's template context
export class AppElement extends StatefulElement {
    getRenderer() { return nano.render; }

    computed(state) {
        return { base_url: window.base_url ?? '' };
    }
}
```

```html
<!-- any component's markup.html -->
<img src="{{ base_url }}/logo.png">
```

---

[← State](../state/README.md) | [Next: Styles →](../styles/README.md)
