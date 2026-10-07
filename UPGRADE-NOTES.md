# Upgrade notes: SWC `1a03fe6` → `1845518`

For anyone upgrading a project (e.g. Caudex) from the SWC version before this
work to the current `main`. It lists what changed, which existing code could
behave differently, how to find it, and which differences are expected so they
aren't mistaken for bugs.

- **Old version:** `1a03fe6` (Merge remote-tracking branch 'origin/scoped-js-files')
- **New version:** `1845518` on `main` (GitHub: `Tumas2/swc`)
- **Full list of changes:** [CHANGELOG.md](CHANGELOG.md)
- **Docs:** [Templates](docs/templates/README.md), [NanoRenderer API](docs/api/nano-renderer.md), [PHP SSR](docs/ssr/php/README.md)

Remember to rebuild `dist/` (`pnpm run build`) if the project uses the bundled file — it isn't tracked in git.

---

## 1. Changes that can affect existing JS code

Check each against the project. Most projects are affected by none or only #1.

| # | Change | Who is affected | How to find it |
| --- | --- | --- | --- |
| 1 | `/` is no longer escaped as `&#x2F;` in `{{ }}` output | Snapshot tests or code that compares rendered HTML strings | Search tests for `&#x2F;` |
| 2 | A tag with arguments is now a **helper call**. `{{a b}}` used to look up the key `"a b"` (almost always empty); now it calls helper `a`, prints nothing and logs `unknown helper "a"` | Templates with a space inside `{{ }}` that isn't `#if`, `#each`, `else`, a `||` fallback or `{{{safe x}}}` | Regex over templates: `\{\{\{?\s*(?!#|/|else\b|safe\s|!|>)[\w.@-]+\s+[^|}]` |
| 3 | Malformed templates render `''` with a console error: a closing tag that doesn't match (`{{#if}}…{{/each}}`), a second `{{else}}`, or a stray closing tag. Some of these used to compile in JS and render something | Templates with unbalanced blocks | A component that suddenly renders empty; the console says `NanoRenderer: Unexpected …` |
| 4 | `{{{safe x}}}` removes more: `<base>`, `<frame>`, SVG `<animate>`/`<set>`, and `javascript:`/`vbscript:` URLs in `action`, `formaction`, `xlink:href`, `data`, `poster`, `background`, `cite` (not only `href`/`src`), also when the scheme contains tabs or newlines | Content that legitimately used those elements or attributes inside `{{{safe}}}` | Search templates for `{{{safe` and review what flows into them |
| 5 | Components whose template comes from a **declarative shadow root** (no `getTemplatePath()`, no `view()`) now render their first time one microtask later, because `connectedCallback()` awaits the new `prepareTemplate()` hook | Code that inserts such a component and reads its shadow DOM synchronously, without waiting for `swc:connected` | Search for components without `getTemplatePath()`/`view()`; check code that reads `shadowRoot` right after insertion |
| 6 | Tags starting with `{{!` are comments now, and `{{> name}}` / `{{&gt; name}}` are partial calls | Templates that used those prefixes for something else (unlikely) | Search templates for `{{!` and `{{>` |
| 7 | Loop frames now also carry `@index`, `@first`, `@last` | Data whose items have keys literally named `@index` etc. (unlikely) | — |

Nothing was removed from the public JS API. New exports: `safeUrl`; new static methods on `NanoRenderer`; new `prepareTemplate()` hook on `StatefulElement`.

## 2. Changes that affect the PHP SSR package

Only relevant if the project renders on the server with `src/php`.

| Change | What to do |
| --- | --- |
| Components must have `manifest.json`; store files must have `"id"` | Rename any leftover `component.json`; check store files use `id`, not `name` |
| Output now follows JS rules: `{{#if []}}` and `{{#if "0"}}` are true, `true` prints `true`, `{{#each}}` skips associative arrays | Server output may change where templates relied on PHP rules. Use `.length` to test lists |
| Nested components in a template are now rendered on the server (they used to be empty) | Pages that rendered children separately and passed them as `light_dom` keep working; templates that contained child tags now get them rendered too |
| DSD output is compact, the stylesheet `<link>` is last, `on*` attributes become `data-swc-event-*` | Update HTML snapshot tests |
| `StateInjector` emits `{}` (not `[]`) for empty store state | JS code that checked `Array.isArray(state)` on an empty store |
| `swc.php` is an autoloader now | Code that `include`d individual class files must include `swc.php` instead (two new classes exist: `Markup`, `TemplateLoader`) |
| PHP ≥ 8.4 (was 8.5) | — |

## 3. Expected differences when comparing old and new output

These are not bugs:

- `&#x2F;` → `/` everywhere in rendered text and attributes.
- PHP SSR only: whitespace inside DSD output is gone, the stylesheet link moved to the end of the shadow root, and `onclick="…"` reads `data-swc-event-click="…"`.
- `{{{safe}}}` output loses the elements and attributes listed in §1 #4.

Anything else that differs is worth a closer look.

## 4. How to verify an upgrade

1. **Library tests** in the SWC repo: `php src/php/tests/run.php` → 240 passed (Node on `PATH` runs the JS/PHP parity tests).
2. **Template scan** in the project: run the searches from §1 (#2 and #3 matter most).
3. **Render comparison:** render the same pages with the old and new version and diff them. Ignore the differences in §3.
4. **Browser:** load the main pages with the console open. New messages to look for:
   - `NanoRenderer: unknown helper "…"` → §1 #2
   - `NanoRenderer: Unexpected {{…}}` / `Unclosed template block(s)` → §1 #3
   - `NanoRenderer: unknown partial "…"` → a `{{> }}` tag (§1 #6)
5. **Hydration (if using PHP SSR):** after JS loads, server-rendered elements should still be the same nodes. Only each component's trailing `<link rel="stylesheet">` is removed.

## 5. New features, briefly

Not needed for the upgrade; see the docs for details.

- Template syntax: `{{#unless}}`, `@index` / `@first` / `@last`, `{{! }}` comments.
- Helpers: `NanoRenderer.registerHelper()`, built-in `{{url value}}` for safe links.
- Named partials: `{{> name}}`, `{{> name path}}`, with an async resolver.
- PHP: nested rendering with context, `set_computed()`, `add_path()`, light-DOM mode, `{{#html}}` partials, compiled-template cache.
