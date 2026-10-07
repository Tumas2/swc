# NanoRenderer — API Reference

Full reference for `NanoRenderer`, the built-in template engine, and `NanoRenderStatefulElement`. For the template syntax, see [Templates](../templates/README.md).

The PHP package has a matching `SWC\NanoRenderer` that produces the same output for the same template and data — see [PHP SSR](../ssr/php/README.md#nanorenderer).

---

## Rendering

### `render(template, data)`

```
render(template: string, data: object): string
```

Renders a template string against a data object. Templates are compiled once and cached on the instance.

- Returns `''` if the template is malformed (an unclosed block, a mismatched closing tag, a second `{{else}}`), and logs a console error.
- Bound to its instance, so `getRenderer() { return nano.render; }` works.

### `compile(template)`

```
compile(template: string): (data: object) => string
```

Compiles a template into a render function, or returns the cached one. `render()` calls this for you.

---

## Helpers

### `NanoRenderer.registerHelper(name, fn)` *(static)*

```
static registerHelper(name: string, fn: (...args: any[]) => any): void
```

Registers a helper for every renderer, callable as `{{name arg1 arg2}}` (escaped) or `{{{name arg1}}}` (raw).

- **Names** must match `/^[A-Za-z_][\w-]*$/`; anything else throws. `safe` can't be used, because `{{{safe x}}}` already means "sanitize".
- **Arguments** are positional: `"strings"`, `'strings'`, numbers, `true` / `false` / `null`, and paths (`user.name`, `this`, `@index`). Missing paths arrive as `undefined`.
- **A tag with arguments is a helper call; a tag without arguments is a data lookup**, so `{{url}}` reads data and `{{url link}}` calls the helper.
- **Output:** the return value is converted with `String()`; `null` / `undefined` print nothing.
- **Errors:** an unknown helper, or one that throws, prints nothing and logs one console message per name.
- Registering an existing name replaces it, including the built-in `url`.
- Components that are also rendered on the server need the same helper registered in PHP with `NanoRenderer::register_helper()`, producing the same output.

```javascript
import { NanoRenderer } from 'swc';

NanoRenderer.registerHelper('t', (key) => translations[key] ?? key);
NanoRenderer.registerHelper('initials', (first, last) => `${first[0]}${last[0]}`);
```

```html
<button>{{ t "Save" }}</button>
<span class="avatar">{{ initials user.first user.last }}</span>
```

### Built-in `{{url value}}`

Returns `value` unchanged when it is safe to put in `href` or `src`, otherwise `"#"`. Safe means it has no scheme (relative paths, `//host`, `#fragment`, `?query`) or uses `http`, `https`, `mailto` or `tel`. Whitespace and control characters are ignored when reading the scheme, so `"java\tscript:"` is caught. Plain `{{value}}` escaping does not make a URL safe in an attribute.

### `safeUrl(value)`

```
safeUrl(value: any): string
```

The function behind `{{url}}`, exported for use outside templates (e.g. validating a URL before saving it). Same rules as `Sanitizer::safe_url()` in PHP.

```javascript
import { safeUrl } from 'swc';

safeUrl('https://example.com'); // 'https://example.com'
safeUrl('javascript:alert(1)'); // '#'
```

---

## Partials

### `NanoRenderer.registerPartial(name, template)` *(static)*

```
static registerPartial(name: string, template: string): void
```

Registers a named partial for every renderer, used as `{{> name}}` (shares the caller's context) or `{{> name path}}` (renders with that value as its only context). Names may contain letters, digits, `_`, `-`, `/` and `.`. A registered partial is kept even when the resolver changes.

### `NanoRenderer.setPartialResolver(resolver)` *(static)*

```
static setPartialResolver(resolver: ((name: string) => Promise<string | null> | string | null) | null): void
```

Sets the function that supplies partials that aren't registered. It may be async, and returns the template or `null`.

- It is asked once per name, when partials are loaded (see `loadPartials`), never during rendering.
- Setting a resolver forgets every partial the previous resolver supplied, so set it again whenever the source of partials changes. Answers that arrive after the resolver was replaced are dropped.

```javascript
NanoRenderer.setPartialResolver(async (name) => {
    const response = await fetch(`/partials/${name}.html`);
    return response.ok ? response.text() : null;
});
```

### `NanoRenderer.loadPartials(template)` *(static)*

```
static async loadPartials(template: string): Promise<void>
```

Loads every partial the template uses, and the partials those use, through the resolver. `NanoRenderStatefulElement` calls this before its first render; call it yourself before rendering a template with a bare `NanoRenderer` or from `view()`.

---

## `NanoRenderStatefulElement`

A `StatefulElement` that renders with a shared `NanoRenderer`, so each template is compiled once for the whole page.

| Method | What it does |
| :--- | :--- |
| `getRenderer()` | Returns the shared renderer's `render` |
| `prepareTemplate(template)` | Calls `NanoRenderer.loadPartials(template)` before the first render (see [`prepareTemplate`](stateful-element.md#preparetemplatetemplate)) |

---

[← StatefulElement](stateful-element.md) | [Next: defineComponents →](define-components.md)
