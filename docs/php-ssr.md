# PHP SSR — Server-Side Rendering

The `src/php/` package renders SWC components server-side as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom), so content is visible before JavaScript loads. When JS does load, `morph()` reconciles the server-rendered DOM with the client state — no flicker, no pop-in.

**Requirements:** PHP ≥ 8.5, `ext-dom`

---

## Loading the Package

No Composer install required — include the class files directly:

```php
$php_src = __DIR__ . '/path/to/swc/src/php/src';
foreach (['Sanitizer', 'NanoRenderer', 'StateInjector', 'Component', 'StoreRegistry', 'ComponentRegistry'] as $class) {
    include_once $php_src . '/' . $class . '.php';
}

use SWC\StoreRegistry;
use SWC\ComponentRegistry;
```

---

## Manifest Files

### `component.json`

Each component folder that should be auto-discovered needs a `component.json`:

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
| `name` | Custom element tag name — must match `customElements.define()` |
| `stores` | Store keys the component needs (matched against `StoreRegistry`) |

### `store.json`

Each store that should be auto-discovered needs a `store.json` in the stores folder:

```json
{
    "name": "workStore",
    "title": "Work History Store",
    "state": {
        "companies": []
    }
}
```

| Field | Description |
| :--- | :--- |
| `name` | Store key — must match the key used in `getStores()` on the JS side |
| `state` | Default state. Also used by JS `createStore(meta)` |

---

## StoreRegistry

Auto-discovers all `store.json` files in a folder and manages their state. Pass it to `ComponentRegistry` for automatic data injection.

```php
$stores = new StoreRegistry(__DIR__ . '/stores');

// Merge server-side data on top of the store.json defaults
$stores->merge('workStore', ['companies' => $db_companies]);
```

### Methods

| Method | Description |
| :--- | :--- |
| `merge(key, data)` | Shallow-merges `data` into the named store's state |
| `get_state(key)` | Returns the current state array for a store |
| `has_store(key)` | Returns `true` if the store was discovered or added |
| `get_all()` | Returns all store states as an associative array |
| `to_script_tag()` | Emits `<script>window.__SWC_INITIAL_STATE__ = {...};</script>` |

Place `to_script_tag()` in `<head>` before the JS module import. The JS `createStore()` function picks it up automatically.

---

## ComponentRegistry

Auto-discovers components from a folder (any sub-folder with a `component.json`) and renders them with state from `StoreRegistry`.

```php
$components = new ComponentRegistry(
    fs_base:  __DIR__ . '/components',
    web_base: '/my-app/components',
    stores:   $stores,   // optional
);

echo $components->preload_tags();           // <link rel="preload"> for each stylesheet
echo $components->render('work-history');  // renders the component as DSD
```

### Methods

| Method | Description |
| :--- | :--- |
| `render(tag_name, host_attrs?, light_dom?)` | Renders a component to a DSD HTML string |
| `preload_tags()` | Returns `<link rel="preload">` for every component's `style.css` |
| `get_component(tag_name)` | Returns the raw `Component` object, or `null` if not found |

---

## Component

Use `Component` directly when you need fine-grained control over paths or data — for example when a component needs data that isn't in `StoreRegistry`.

```php
use SWC\Component;

$c = new Component(
    fs_path:  __DIR__ . '/components/skills-grid',
    web_path: '/my-app/components/skills-grid',
    // tag_name defaults to basename(fs_path) → "skills-grid"
);

echo $c->preload_tag();                      // <link rel="preload"> for style.css
echo $c->render($data, $host_attrs, $light_dom);
```

### `render(data, host_attrs, light_dom)`

| Param | Type | Description |
| :--- | :--- | :--- |
| `data` | `array` | Template data (store state + computed values) passed to NanoRenderer |
| `host_attrs` | `array` | Extra attributes on the host element (`['slot' => 'content']`) |
| `light_dom` | `string` | HTML injected as light DOM children (for slotted content) |

---

## StateInjector

Lower-level alternative to `StoreRegistry` when you don't have store.json files.

```php
use SWC\StateInjector;

$injector = new StateInjector();
$injector->set('workStore', $work_data);
$injector->set('skillsStore', $skills_data);

echo $injector->to_script_tag();
// <script>window.__SWC_INITIAL_STATE__ = {"workStore":{...},"skillsStore":{...}};</script>
```

---

## Full Example

```php
<?php
declare(strict_types=1);

// Load classes
$php_src = __DIR__ . '/../../src/php/src';
foreach (['Sanitizer', 'NanoRenderer', 'StateInjector', 'Component', 'StoreRegistry', 'ComponentRegistry'] as $class) {
    include_once $php_src . '/' . $class . '.php';
}

use SWC\StoreRegistry;
use SWC\ComponentRegistry;

// Stores — auto-discover from stores/ folder, merge server data
$stores = new StoreRegistry(__DIR__ . '/stores');
$stores->merge('workStore', ['companies' => $my_db_rows]);

// Components — auto-discover from components/ folder
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
    <script type="module" src="/my-app/swc.js"></script>
</head>
<body>
    <?= $components->render('site-nav') ?>
    <?= $components->render('work-history') ?>
</body>
</html>
```

### Output (simplified)

```html
<work-history>
  <template shadowrootmode="open">
    <link rel="stylesheet" href="/my-app/components/work-history/style.css">
    <!-- NanoRenderer output from markup.html + store state -->
  </template>
</work-history>
```

When JS loads, `createStore('workStore')` reads `window.__SWC_INITIAL_STATE__.workStore` and initialises with the server state. The first client render calls `morph()` against already-correct DOM — result is a no-op, zero flicker.
