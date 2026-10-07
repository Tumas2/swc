# 002 — SSR rework and template extensions: what still needs documenting

**Status:** Implemented, not merged. Docs partly written.
**Branches:** `php-ssr-fixes` (PHP package), `nano-extensions` (built on top: template syntax, helpers, partials).

This is a to-do list for `docs/`, not a design. Delete it once everything below
is written up there.

---

## Already documented

`docs/templates/README.md` covers:

- `{{#unless}}`, `@index` / `@first` / `@last`, `{{! }}` / `{{!-- --}}` comments
- truthiness (JS rules; test lists with `.length`) and that loop items shadow outer names
- helpers: argument syntax, "arguments = helper call, none = data lookup", `registerHelper`, built-in `{{url}}`
- named partials: `{{> name}}` vs `{{> name path}}`, recursion limit, `registerPartial`, `setPartialResolver`, `loadPartials`, `view()` caveat

## Still to document

### `docs/ssr/php/README.md` — needs a rewrite

It describes the old package. Known errors and gaps:

- **Bug:** store files use `"id"`, not `"name"` (`StoreRegistry` requires `id`).
- **Bug:** the manual include list lacks `Markup` and `TemplateLoader`. Recommend `swc.php` instead.
- `ComponentRegistry`
  - `add_path($fs_base, $web_base)`; duplicate tags warn, first one wins
  - `render($tag, $host_attrs, $light_dom, $data, $shadow)`: extra data merged on top of store state; `light_dom` inserted as-is
  - `set_computed($tag, fn(array $data, array $host_attrs): array)` — server-side `computed()`
  - `has_component()`
  - nested components in a template are rendered recursively (depth limit 32)
  - context: `provides` / `uses` resolved like the client
- `StoreRegistry::add_path()`; duplicate ids warn, first one wins
- `Component`: `render(..., $shadow)`, `render_markup()`, `wrap()`, `attributes_to_string()` (`true` → bare attribute, `false`/`null` omitted)
- **Light-DOM mode** (`shadow: false`): slots filled from light DOM, no stylesheet. Only for pages that don't load the component's JS.
- **Output format and why:** no added whitespace, stylesheet `<link>` last, `on*` → `data-swc-event-*`. Together these make hydration keep every server-rendered node.
- `{{#html './x.html'}}` partials work on the server (relative paths only)
- `StateInjector`: accepts `stdClass` so `{}` stays `{}`; invalid UTF-8 replaced, `INF`/`NAN` → 0 with a warning
- `Sanitizer`: HTML5 parser, stricter than the JS version; `Sanitizer::safe_url()`
- PHP `NanoRenderer`: `register_helper()`, `register_partial()`, `set_partial_resolver()` (sync, called on first use, result kept); same output as JS for the same template and data
- Low-level use without components: `TemplateLoader::load()` + `new NanoRenderer()` (how the CMS renders blocks)
- Static registries: fine under FPM; long-lived workers must re-register per-request helpers
- Tests: `php src/php/tests/run.php` (Node on PATH for parity tests)

### `docs/api/`

- `NanoRenderer.registerHelper()`, `registerPartial()`, `setPartialResolver()`, `loadPartials()`
- `safeUrl()` export
- `StatefulElement.prepareTemplate()` hook (runs once before the first render, file/DSD templates only)

### Changelog / migration notes

Behaviour that changed for existing users:

- **PHP output** now equals the JS render: `{{#if []}}` and `{{#if "0"}}` are true, `true` prints `"true"`, `#each` skips objects.
- **PHP DSD output** is compact with the stylesheet link last; nested components are now server-rendered instead of left empty.
- **JS:** malformed templates (mismatched closing tag, second `{{else}}`, stray closer) render `''` with a console error, like PHP.
- **Both:** `/` is no longer escaped as `&#x2F;`.
- **Both:** a tag with arguments is a helper call. `{{a b}}` used to be a lookup of the key `"a b"`; it is now a call to helper `a` (unknown → `''` + warning).
- PHP requirement lowered to 8.4.

## Open issues found along the way

- `test/portfolio-ssr/index.php` fails fatally (hard-coded class include list), and its components use `component.json`, so nothing is discovered anyway.
- JS `_sanitize()` has the holes the PHP one had (`formaction`, `action`, `xlink:href`, SVG animation, tab inside `javascript:`). `{{{safe}}}` output now differs between JS and PHP for malicious input only.
- PHP template parse cache lives for one process (one request under FPM). The CMS benchmark will show whether compiling templates to OPcache-able PHP files is worth adding.
