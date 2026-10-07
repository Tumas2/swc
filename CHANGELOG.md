# Changelog

## Unreleased

### Templates (JS and PHP)

- **Added** `{{#unless}}`, `@index` / `@first` / `@last` in loops, and `{{! }}` / `{{!-- --}}` comments.
- **Added** helpers: `NanoRenderer.registerHelper()` / `NanoRenderer::register_helper()`, called as `{{name arg …}}` with positional arguments.
- **Added** the built-in `{{url value}}` helper, also exported as `safeUrl()` (JS) and `Sanitizer::safe_url()` (PHP).
- **Added** named partials: `{{> name}}` (shares the context) and `{{> name path}}` (isolated context), with `registerPartial()`, an async `setPartialResolver()` and `loadPartials()`. Recursion up to 32 levels.
- **Added** `StatefulElement.prepareTemplate()`, called once before the first render.
- **Changed:** a tag with arguments is a helper call. `{{a b}}` used to look up the key `"a b"`; it now calls helper `a` (unknown helpers print nothing and warn).
- **Changed:** `/` is no longer escaped as `&#x2F;`. Only `& < > " '` are escaped. The resulting DOM is the same.
- **Changed (JS):** malformed templates — a mismatched closing tag, a second `{{else}}`, a stray closing tag — render `''` with a console error, as in PHP.
- **Changed (JS):** `{{{safe}}}` now applies the same rules as PHP: it also removes `base`, frames and SVG animation elements, and checks every URL attribute (`action`, `formaction`, `xlink:href`, …) for `javascript:` / `vbscript:`, ignoring whitespace and control characters in the scheme.

### PHP SSR

- **Changed:** output now matches the first client render, so hydration keeps every node:
  - JavaScript rules for truthiness and output (`"0"` and `[]` are true, `true` prints `"true"`, numbers format like JS, `{{#each}}` skips objects, `.length` works);
  - compact DSD output with the stylesheet `<link>` last;
  - `on*` attributes converted to `data-swc-event-*`.
- **Added:** nested components are rendered recursively, with `provides` / `uses` context.
- **Added:** `ComponentRegistry::add_path()`, `set_computed()`, `has_component()`, and `data` / `shadow` parameters on `render()`; `StoreRegistry::add_path()`.
- **Added:** light-DOM mode (`shadow: false`): slots filled, no stylesheet, for pages without the component's JS.
- **Added:** `{{#html}}` partials resolved on the server (`TemplateLoader`).
- **Added:** compiled-template cache, `NanoRenderer::set_cache_dir()` (off by default).
- **Added:** a warning when `{{#each}}` gets a list with gaps in its keys.
- **Fixed:** `StateInjector` no longer emits broken JavaScript on invalid UTF-8 or `INF`, and always emits objects for store state; accepts `stdClass`.
- **Fixed:** `Sanitizer` uses the HTML5 parser and closes the `formaction`, `action`, `xlink:href`, `<base>` and SVG animation holes.
- **Changed:** `swc.php` registers an autoloader instead of loading every class.
- **Changed:** PHP requirement lowered from 8.5 to 8.4.
- **Added:** test suite, `php src/php/tests/run.php`, including byte-for-byte parity tests against the JS renderer.

### Examples and tests

- **Fixed:** 13 example and test components still had `component.json` from before the rename to `manifest.json`, so they failed to load.
- **Fixed:** `test/portfolio-ssr` loads the package through `swc.php` and uses `set_computed()`.
