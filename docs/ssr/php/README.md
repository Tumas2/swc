# PHP SSR

The PHP package renders SWC components on the server as [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom). Content is visible before JavaScript loads, and when JS arrives, hydration keeps every server-rendered node: the first client render produces the same markup, so `morph()` has nothing to change.

**Requirements:** PHP ≥ 8.4, `ext-dom`. No Composer dependencies.

---

## Loading the package

Include the loader. It registers an autoloader for the `SWC\` namespace, so only the classes you use are loaded:

```php
require_once __DIR__ . '/path/to/swc/src/php/swc.php';

use SWC\StoreRegistry;
use SWC\ComponentRegistry;
```

With Composer, the package's `composer.json` maps `SWC\` to `src/` (PSR-4), and `swc.php` isn't needed.

---

## Manifest files

### manifest.json

Each component folder needs a `manifest.json`:

```json
{
    "name": "work-history",
    "version": "1.0.0",
    "stores": ["workStore"],
    "uses": ["theme"]
}
```

| Field | Description |
| :--- | :--- |
| `name` | Custom element tag name — must match `customElements.define()` on the JS side |
| `version` | Optional. Appended as `?ver=` to the CSS and JS URLs the package generates |
| `stores` | Store ids the component needs. Each one's state is passed to the template under its id |
| `provides` | Context passed down to nested components: `alias → store id or plain value` |
| `uses` | Context aliases resolved from the nearest ancestor that `provides` them |

### Store files

Each store needs a JSON file with an `id` and either `state` or `attributes`:

```json
{
    "id": "workStore",
    "state": {
        "companies": []
    }
}
```

With `attributes`, the initial state comes from each attribute's `default`. The same file is passed to `createStore()` on the JS side, so defaults are defined in one place. `persist` only matters in the browser.

---

## StoreRegistry

Discovers store files and manages their state. Pass it to `ComponentRegistry` so components get their state automatically.

```php
$stores = new StoreRegistry(__DIR__ . '/stores');
$stores->add_path(__DIR__ . '/plugins/gallery/stores');

// Merge server-side data on top of the defaults
$stores->merge('workStore', ['companies' => $db_companies]);
```

| Method | Description |
| :--- | :--- |
| `add_path(fs_path)` | Discovers stores from another folder. A duplicate id warns and keeps the first one |
| `merge(key, data)` | Shallow-merges `data` into the store's state |
| `get_state(key)` | Returns the store's state |
| `has_store(key)` | Returns `true` if the store exists |
| `get_all()` | Returns every store's state, keyed by id |
| `to_script_tag()` | Emits `<script>window.__SWC_INITIAL_STATE__ = {...};</script>` |

Place `to_script_tag()` in `<head>`, before your module scripts.

---

## ComponentRegistry

Discovers components (any sub-folder with a `manifest.json`) and renders them with their store state.

```php
$components = new ComponentRegistry(
    fs_base:  __DIR__ . '/components',
    web_base: '/my-app/components',
    stores:   $stores,
);
$components->add_path(__DIR__ . '/plugins/gallery/components', '/plugins/gallery/components');

echo $components->preload_tags();          // <link rel="preload"> for each stylesheet
echo $components->script_tags();           // <script type="module"> for each component.js
echo $components->render('work-history');
```

| Method | Description |
| :--- | :--- |
| `render(tag_name, host_attrs?, light_dom?, data?, shadow?)` | Renders a component, including every component nested in it |
| `add_path(fs_base, web_base)` | Discovers components from another folder. A duplicate tag warns and keeps the first one, like `customElements.define()` |
| `set_computed(tag_name, callback)` | Server-side equivalent of the component's JS `computed()` |
| `has_component(tag_name)` | Returns `true` if the component was discovered |
| `preload_tags()` / `script_tags()` | `<link rel="preload">` / `<script type="module">` for every component |
| `get_component(tag_name)` | Returns the `Component` object, or `null` |

### `render()` parameters

| Parameter | Description |
| :--- | :--- |
| `host_attrs` | Attributes on the host element, e.g. `['slot' => 'history']`. `true` renders a bare attribute; `false` and `null` omit it |
| `light_dom` | HTML placed inside the host element as-is. Render it with the registry first |
| `data` | Extra template data, merged on top of the store state |
| `shadow` | `true` (default) for Declarative Shadow DOM, `false` for plain light DOM — see below |

### Data a template receives

Built in the same order as `StatefulElement` resolves stores in the browser:

1. context aliases from `uses`, resolved from the nearest ancestor's `provides`;
2. the manifest's `stores`, keyed by id — these win any collision;
3. plain context values, which never shadow a store;
4. the `data` passed to `render()`;
5. the `set_computed()` callback's result.

### Computed values

If a component's template uses values from its JS `computed()`, register the PHP equivalent. The callback receives the data and the host attributes, and returns values to merge on top:

```php
$components->set_computed('skills-grid', function (array $data, array $host_attrs): array {
    $query = strtolower(trim($data['skillsStore']['query'] ?? ''));
    $all   = $data['skillsStore']['skills'] ?? [];

    return [
        'filteredSkills' => $query === ''
            ? $all
            : array_values(array_filter($all, fn($s) => str_contains(strtolower($s['name']), $query))),
    ];
});
```

It runs for every render of that tag, including nested ones.

### Nested components and context

When a component's markup contains another registered component, that one is rendered too, recursively, so the whole tree arrives server-rendered. Children written inside the tag in the template are kept as its light DOM.

`provides` and `uses` work as in the browser: a nested component resolves each alias in `uses` from the nearest ancestor that provides it. A component's own `provides` applies to its children, never to itself.

Nesting stops at 32 levels with a warning, which catches a component that renders itself.

### Light-DOM mode

`render(..., shadow: false)` renders without shadow DOM: each `<slot>` is replaced by the light-DOM children assigned to it (or its fallback content), and no stylesheet is linked. Use it for static output that theme CSS styles, on pages that **don't** load the component's JS — if the JS loads, it attaches a shadow root and the flattened content no longer lines up.

---

## Component (direct use)

`Component` renders a single component without a registry:

```php
use SWC\Component;

$c = new Component(
    fs_path:  __DIR__ . '/components/skills-grid',
    web_path: '/my-app/components/skills-grid',
    // tag_name defaults to basename(fs_path)
);

echo $c->render($data, $host_attrs, $light_dom, shadow: true);
```

| Method | Description |
| :--- | :--- |
| `render(data, host_attrs?, light_dom?, shadow?)` | Renders the component; no nested components or context |
| `render_markup(data)` | Renders only `markup.html`, without the host element |
| `wrap(markup, attr_str, light_dom?, shadow?)` | Wraps rendered markup in the host element |
| `attributes_to_string(attrs)` *(static)* | Builds an escaped attribute string |
| `preload_tag()` / `script_tag()` / `get_tag_name()` | As on the registry, for one component |

---

## What the output looks like

```html
<work-history slot="history"><template shadowrootmode="open"><ol>…</ol><link rel="stylesheet" href="/my-app/components/work-history/style.css?ver=1.0.0"></template></work-history>
```

The format is chosen so hydration keeps every node:

- **No added whitespace**, and the **stylesheet link comes last.** The client morphs the shadow root against `markup.html` by position, and the JS template has no `<link>`, so only that trailing link is removed. Anything before the markup would shift every node and force them all to be replaced.
- **Event attributes are converted** the way `StatefulElement` does it: `onclick="$toggle"` becomes `data-swc-event-click="$toggle"`, so nothing runs inline before JS loads.
- **`{{#html './partial.html'}}` includes** are resolved on the server, relative to the including file. Web-root paths (`/…`) can't be mapped to the filesystem and render empty with a warning.

---

## NanoRenderer

The PHP `NanoRenderer` produces the same output as the JS one for the same template and data, so it follows JavaScript rules rather than PHP's:

- `"0"` and `[]` are true in `{{#if}}`; `0`, `""`, `null` and `false` are not.
- `true` prints `true`, a list prints `1,2,3`, numbers print like JS (`0.1 + 0.2` → `0.30000000000000004`).
- `{{#each}}` only loops over lists. An associative array is a JS object and renders the `{{else}}` branch.
- `.length` works on lists and strings.

PHP arrays can't tell an empty object `{}` from an empty list `[]`. Where that matters, pass `stdClass` objects (e.g. `json_decode($json)` without `$associative`); the renderer and `StateInjector` accept both.

A list with gaps in its keys (e.g. after `array_filter()`) isn't a list, so `{{#each}}` renders nothing — PHP warns once per path. Use `array_values()` first.

### Helpers and partials

The template syntax is described in [Templates](../../templates/README.md). The PHP side has the same registries:

```php
use SWC\NanoRenderer;

NanoRenderer::register_helper('t', fn(string $key): string => translate($key));
NanoRenderer::register_partial('site-header', '<header>{{ site.name }}</header>');
NanoRenderer::set_partial_resolver(fn(string $name): ?string => $theme->partial($name));
```

- Helpers used by components that also render in the browser must be registered in JS too, with the same output. Helpers only used in server-only templates can be PHP-only.
- The partial resolver is called on first use of each name, and its answer is kept. Setting a resolver again forgets the partials the previous one supplied (registered ones stay) — call it whenever the source changes, e.g. after a theme switch.
- The built-in `{{url value}}` helper is `Sanitizer::safe_url()`.

### Compiled-template cache

Parsed templates are kept in memory, but PHP resets that memory between requests, so without a cache every request parses its templates again. Turn on the file cache to skip that:

```php
NanoRenderer::set_cache_dir(__DIR__ . '/cache/templates');
```

Each parsed template is written once as a PHP file named by a hash of the template text, so OPcache keeps it in memory. An edited template gets a new hash, so nothing goes stale; old files can be deleted at any time. Malformed templates are never cached. The directory must not be writable by untrusted users — its files are included as PHP.

### Templates without components

For markup that isn't a custom element (e.g. content blocks or theme layouts), use the renderer directly:

```php
use SWC\NanoRenderer;
use SWC\TemplateLoader;

$template = TemplateLoader::load(__DIR__ . '/blocks/quote.html'); // resolves {{#html}} includes, cached
echo (new NanoRenderer())->render($template, $block_data);
```

---

## StateInjector

`StoreRegistry::to_script_tag()` uses it; you can also use it on its own:

```php
$injector = new SWC\StateInjector();
$injector->set('editor', json_decode($saved_json)); // stdClass keeps {} as {}
echo $injector->to_script_tag();
```

- Store state is always emitted as an object; an empty store is `{}`.
- The JSON is safe inside `<script>` (`</script>` can't break out).
- Invalid UTF-8 is replaced with U+FFFD; `INF` / `NAN` become `0` with a warning. The page never gets broken JavaScript.

---

## Sanitizer

| Method | Description |
| :--- | :--- |
| `Sanitizer::clean($html)` | What `{{{safe value}}}` uses. Removes `script`, `iframe`, `object`, `embed`, `style`, `link`, `meta`, `base`, frames and SVG animation elements, every `on*` attribute, and URL attributes (`href`, `src`, `action`, `formaction`, `xlink:href`, …) using `javascript:` or `vbscript:` |
| `Sanitizer::safe_url($url)` | Returns the URL if it has no scheme or uses `http`, `https`, `mailto` or `tel`; otherwise `#`. Use it to validate URLs before saving them |

Both ignore whitespace and control characters when reading a URL's scheme. The JS side applies the same rules.

---

## Long-running processes

Helpers, partials and the template cache are static, which is fine under PHP-FPM. In a long-running worker (Swoole, RoadRunner), re-register helpers that capture per-request values (like the current language) at the start of each request, and set the partial resolver again when the partial source changes.

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
    <?= $components->script_tags() ?>
</head>
<body>
    <?= $components->render('site-nav') ?>
    <?= $components->render('work-history') ?>
</body>
</html>
```

`script_tags()` outputs one `<script type="module">` per component; the browser resolves their imports. Alternatively, use one hand-written entry point that imports your components and stores.

When JS loads, `createStore('workStore')` reads `window.__SWC_INITIAL_STATE__.workStore`, and the first render matches what the server sent.

---

## Tests

```bash
php src/php/tests/run.php
```

No dependencies. The parity tests render every case through the real JS `NanoRenderer` with Node.js and compare the output byte for byte; they're skipped when `node` isn't on `PATH`.

---

[← SSR](../README.md) | [Next: API Reference →](../../api/README.md)
