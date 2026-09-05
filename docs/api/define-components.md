# defineComponents

Registers custom elements with optional lazy loading. Replaces manual import lists in `components/index.js`.

```javascript
import { defineComponents, requestComponents, whenVisible, whenIdle } from './swc.js';
```

---

## defineComponents(definitions, options?)

```javascript
defineComponents(definitions, options?)
```

| Parameter | Type | Description |
|:--|:--|:--|
| `definitions` | `Record<string, () => Promise<*>>` | Map of tag names to dynamic import functions |
| `options.lazy` | `boolean` | `true` = defer all; `false` = eager all (default: `false`) |
| `options.except` | `string[]` | Exception list — these get the opposite of `lazy` (default: `[]`) |
| `options.trigger` | `function` | Custom load-timing function (see below) |

### Eager (default)

```javascript
defineComponents({
    'site-header': () => import('./site-header/component.js'),
    'main-nav':    () => import('./main-nav/component.js'),
});
```

### Lazy — all except listed

```javascript
defineComponents({
    'site-header': () => import('./site-header/component.js'),
    'main-nav':    () => import('./main-nav/component.js'),
    'settings':    () => import('./settings/component.js'),
}, {
    lazy: true,
    except: ['site-header']  // loads eagerly; rest defer
});
```

### Lazy — only listed

```javascript
defineComponents({
    'site-header': () => import('./site-header/component.js'),
    'settings':    () => import('./settings/component.js'),
}, {
    lazy: false,
    except: ['settings']  // only settings defers
});
```

---

## Nested components

Lazy discovery finds elements in the light DOM, and — via the router's `swc:render` event —
inside a `router-switch` shadow root. It does **not** find a component nested inside another
*component's* shadow root. An undefined custom element never upgrades, so it can never
announce itself; nothing is watching that shadow root on its behalf.

A parent declares those children in its `manifest.json` instead:

```json
{
    "name": "meal-builder",
    "version": "1.0.0",
    "stores": ["calorieTrackerStore"],
    "components": ["meal-item-editor"]
}
```

When `meal-builder` connects, `meal-item-editor` is loaded with it. The child then connects
and loads *its* declared components, so a single declaration per level carries the cascade to
any depth. Both stay lazy in `defineComponents` — neither is fetched until something actually
renders a `<meal-builder>`.

The child still needs an entry in `defineComponents`; the manifest says *when* to load it, not
where to find it. A declared name that was never registered logs a warning:

```
SWC: <meal-builder> declares component "meal-item-editorr" which is not registered. Add it to defineComponents().
```

Declared components load immediately, ignoring any `trigger`. The parent is already rendering
the child, so waiting on viewport or idle would mean waiting on an element that does not exist
yet. Dependency cycles are safe — a name is dropped from the pending set before its import
starts, so the second request is a no-op.

### Components created at runtime

A manifest declares children a component knows about statically. When a host builds its
children from runtime state — a dashboard placing whichever widgets the user configured —
it cannot list them ahead of time.

For that case, dispatch `swc:connected` on the element after creating it. An unregistered
element has no `connectedCallback` to fire the event itself, so this manual dispatch is the
only signal it can produce:

```javascript
const el = document.createElement(widgetName);
host.appendChild(el);
el.dispatchEvent(new CustomEvent('swc:connected', {
    bubbles: true,
    composed: true,
    detail: { name: widgetName, element: el },
}));
```

`defineComponents` listens for this on `document` and loads the component if it is pending.
Unlike a manifest declaration, this path respects the registered `trigger` — the element
exists, so deferring on viewport or idle is meaningful.

---

## requestComponents(names, requestedBy?)

The imperative form of the above. `StatefulElement` calls it with `manifest.components`; call it
directly when a component creates children in JavaScript rather than in its template.

| Parameter | Type | Description |
|:--|:--|:--|
| `names` | `string[]` | Tag names to load now |
| `requestedBy` | `string` | Requesting tag name, used in the warning message (default: `'unknown'`) |

```javascript
onMount() {
    requestComponents(['meal-item-editor'], this.localName);
}
```

---

## trigger function

Called when a lazy component's elements are found in the DOM. Receives `{ name, elements, load }`.

| Property | Type | Description |
|:--|:--|:--|
| `name` | `string` | The custom element tag name |
| `elements` | `Element[]` | All matching elements currently in the DOM |
| `load` | `function` | Call to trigger the import — idempotent, safe to call multiple times |

```javascript
defineComponents({...}, {
    lazy: true,
    trigger: ({ name, elements, load }) => {
        // decide when to call load()
    }
});
```

---

## whenVisible(options?)

Returns a trigger function that loads a component when it first enters the viewport.

```javascript
defineComponents({...}, {
    lazy: true,
    trigger: whenVisible({ rootMargin: '200px' })
});
```

| Option | Type | Default | Description |
|:--|:--|:--|:--|
| `rootMargin` | `string` | `'0px'` | Margin around the viewport for early loading |
| `threshold` | `number` | `0` | Intersection ratio needed to trigger load |

---

## whenIdle(options?)

Returns a trigger function that loads a component during browser idle time via `requestIdleCallback`. Falls back to `setTimeout(fn, 0)` in browsers that don't support it.

```javascript
defineComponents({...}, {
    lazy: true,
    trigger: whenIdle({ timeout: 2000 })
});
```

| Option | Type | Default | Description |
|:--|:--|:--|:--|
| `timeout` | `number` | `2000` | Max ms to wait before forcing load if idle never fires |

---

[← StatefulElement](stateful-element.md)
