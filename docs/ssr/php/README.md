# PHP SSR

The PHP package renders SWC components server-side as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom). Content is visible before JavaScript loads — when JS arrives, `morph()` reconciles the DOM and the result is a no-op.

**Requirements:** PHP ≥ 8.5, `ext-dom`

---

## Loading the package

No Composer install is required yet. The simplest way is to include the single loader file — it pulls in all classes in the right order:

```php
require_once __DIR__ . '/path/to/swc/src/php/swc.php';

use SWC\StoreRegistry;
use SWC\ComponentRegistry;
```

If you prefer to load only specific classes, you can include them individually from `src/php/src/`:

```php
$php_src = __DIR__ . '/path/to/swc/src/php/src';
foreach ([
    'Sanitizer', 
    'NanoRenderer', 
    'StateInjector', 
    'Component', 
    'StoreRegistry', 
    'ComponentRegistry'
] as $class) {
    require_once $php_src . '/' . $class . '.php';
}
```

---

## Manifest files

### component.json

Each component you want to auto-discover needs a `component.json` in its folder:

```json
{
    "name": "work-history",
    "version": "1.0.0",
    "title": "Work History",
    "stores": ["workStore"]
}
```

| Field | Description |
| :--- | :--- |
| `name` | Custom element tag name — must match `customElements.define()` on the JS side |
| `version` | Optional. Appended as `?ver=` to all CSS and JS URLs the PHP package generates — bump it to force browsers to fetch fresh assets |
| `stores` | Store keys the component needs — matched against `StoreRegistry` |

### store.json

Each store you want to auto-discover needs a `store.json` in the stores folder:

```json
{
    "name": "workStore",
    "title": "Work History Store",
    "state": {
        "companies": []
    }
}
```

The `state` field is the default. This same file can be passed to `createStore()` on the JS side so the default state is defined in one place.

---

## StoreRegistry

Auto-discovers all `store.json` files in a folder and manages their state. Pass it to `ComponentRegistry` for automatic data injection.

```php
$stores = new StoreRegistry(__DIR__ . '/stores');

// Merge server-side data on top of store.json defaults
$stores->merge('workStore', ['companies' => $db_companies]);
```

| Method | Description |
| :--- | :--- |
| `merge(key, data)` | Shallow-merges `data` into the named store's state |
| `get_state(key)` | Returns the current state array for a store |
| `has_store(key)` | Returns `true` if the store exists |
| `get_all()` | Returns all store states as an associative array |
| `to_script_tag()` | Emits `<script>window.__SWC_INITIAL_STATE__ = {...};</script>` |

Place `to_script_tag()` in `<head>` before the JS module import.

---

## ComponentRegistry

Auto-discovers components from a folder (any sub-folder with a `component.json`) and renders them with state from `StoreRegistry`.

```php
$components = new ComponentRegistry(
    fs_base:  __DIR__ . '/components',
    web_base: '/my-app/components',
    stores:   $stores,
);

echo $components->preload_tags();          // <link rel="preload"> for each stylesheet
echo $components->script_tags();           // <script type="module"> for each component.js
echo $components->render('work-history'); // renders component as DSD HTML
```

| Method | Description |
| :--- | :--- |
| `render(tag_name, host_attrs?, light_dom?)` | Renders a component to a DSD HTML string |
| `preload_tags()` | Returns `<link rel="preload">` for every component's `style.css` |
| `script_tags()` | Returns `<script type="module">` for every component's `component.js` |
| `get_component(tag_name)` | Returns the raw `Component` object, or `null` if not found |

---

## Component (direct use)

Use `Component` when you need fine-grained control — for example, when a component needs computed data not in `StoreRegistry`.

```php
use SWC\Component;

$c = new Component(
    fs_path:  __DIR__ . '/components/skills-grid',
    web_path: '/my-app/components/skills-grid',
    // tag_name defaults to basename(fs_path) → 'skills-grid'
);

echo $c->preload_tag();   // <link rel="preload" href=".../style.css?ver=1.0.0" as="style">
echo $c->script_tag();    // <script type="module" src=".../component.js?ver=1.0.0"></script>
echo $c->render($data, $host_attrs, $light_dom);
```

| Param | Type | Description |
| :--- | :--- | :--- |
| `data` | array | Template data passed to NanoRenderer |
| `host_attrs` | array | Extra attributes on the host element (e.g. `['slot' => 'content']`) |
| `light_dom` | string | HTML injected as light DOM children (for slotted content) |

---

## Full example

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../src/php/swc.php';

use SWC\StoreRegistry;
use SWC\ComponentRegistry;

$stores = new StoreRegistry(__DIR__ . '/stores');
$stores->merge('workStore', ['companies' => $my_db_rows]);

$components = new ComponentRegistry(
    fs_base:  __DIR__ . '/components',
    web_base: '/my-app/components',
    stores:   $stores,
);
?>
<!DOCTYPE html>
<html>
<head>
    <?= $components->preload_tags() ?>
    <?= $stores->to_script_tag() ?>

    <?php // Option A: let PHP generate a script tag for each discovered component ?>
    <?= $components->script_tags() ?>

    <?php // Option B: a hand-written entry point that imports your components ?>
    <?php // <script type="module" src="/my-app/app.js"></script> ?>
</head>
<body>
    <?= $components->render('site-nav') ?>
    <?= $components->render('work-history') ?>
</body>
</html>
```

**Option A** — `script_tags()` outputs one `<script type="module" src=".../component.js?ver=...">` per discovered component. The browser's native ES module system resolves their internal imports (SWC library, stores) automatically. No extra files needed.

**Option B** — a hand-written `app.js` gives you one explicit entry point, which is useful if you also need to import stores or run app-level setup code alongside the components:

```js
// app.js
import './components/site-nav/component.js';
import './components/work-history/component.js';
```

### What the output looks like

```html
<work-history>
  <template shadowrootmode="open">
    <link rel="stylesheet" href="/my-app/components/work-history/style.css">
    <!-- NanoRenderer output from markup.html -->
  </template>
</work-history>
```

The browser renders this immediately. When JS loads, `createStore('workStore')` reads `window.__SWC_INITIAL_STATE__.workStore` and the first render is a no-op against already-correct DOM.

---

[← SSR](../README.md) | [Next: API Reference →](../../api/README.md)
