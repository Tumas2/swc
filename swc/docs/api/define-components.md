# defineComponents

Registers custom elements with optional lazy loading. Replaces manual import lists in `components/index.js`.

```javascript
import { defineComponents, whenVisible, whenIdle } from './swc.js';
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
