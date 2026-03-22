# Tooling

SWC ships three companion tools that reduce the manual work of setting up components, stores, and IDE support.

---

## CLI

The CLI scaffolds components and stores so you don't have to create four files by hand every time.

**Run without installing:**

```bash
npx @swc-lib/cli create component <name>
npx @swc-lib/cli create store <name>
```

If you omit the name, the CLI will prompt for it.

---

### `create component`

```bash
npx @swc-lib/cli create component my-card
```

Creates a complete four-file component under `./components/my-card/` relative to your current directory:

```
components/my-card/
├── component.js     ← NanoRenderStatefulElement class
├── component.json   ← manifest (name, version, stores)
├── markup.html      ← NanoRenderer template
└── style.css        ← scoped shadow DOM styles
```

The generated `component.js` imports from `../../swc.js` by default. Adjust the path comment at the top of the file if your project layout differs.

**Name formats accepted:** `my-card`, `MyCard`, `my card` — all normalise to `my-card` / `MyCard`.

---

### `create store`

```bash
npx @swc-lib/cli create store cart
```

Creates `./stores/cart-store.json`:

```json
{
    "$schema": "../../../../schemas/store.schema.json",
    "id": "cartStore",
    "state": {}
}
```

Fill in your initial state, then import the store in `components/stores.js`:

```javascript
import { createStore } from '../swc.js';
import meta from '../stores/cart-store.json' with { type: 'json' };

export const cartStore = createStore(meta);
```

---

### Conflict guard

The CLI exits with an error if the target directory or file already exists — it will never overwrite your work.

---

## VS Code Extension

The extension lives in `vscode-swc/` and provides two things: automatic JSON validation for manifest files and a set of code snippets.

### Installing locally

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **Extensions: Install from VSIX...** and select `vscode-swc/` — or open the `vscode-swc/` folder in VS Code and press `F5` to launch an Extension Development Host

### JSON validation

Once the extension is installed, VS Code automatically validates `component.json` and `stores/*.json` files. No `$schema` field is required — validation triggers by file path pattern.

What gets checked in **component.json**:
- `name` must be kebab-case and contain at least one hyphen
- `version` must be a valid semver string
- `stores` must be an array of strings

What gets checked in **store manifests**:
- `id` is required
- `attributes` entries must have a `type` (`string`, `number`, `boolean`, `array`, or `object`) and a `default`

### Snippets

Type the prefix and press `Tab` (or select from IntelliSense) to expand.

#### JavaScript (`.js`)

| Prefix | Expands to |
| :-- | :-- |
| `swc-component` | Full `NanoRenderStatefulElement` class with imports and `customElements.define()` |
| `swc-store-import` | `createStore` import pattern — import meta, create store, export |

#### HTML (`.html` — markup templates)

| Prefix | Expands to |
| :-- | :-- |
| `swc-if` | `{{#if condition}}…{{/if}}` |
| `swc-if-else` | `{{#if condition}}…{{else}}…{{/if}}` |
| `swc-each` | `{{#each items}}…{{/each}}` |
| `swc-importmap` | Full `<script type="importmap">` block |
| `swc-module-script` | `<script type="module" src="…">` tag |

#### JSON (`.json`)

| Prefix | Expands to |
| :-- | :-- |
| `swc-component-json` | Full `component.json` manifest |
| `swc-store-json` | `store.json` with `state` |
| `swc-store-attributed-json` | `store.json` with typed `attributes` |

#### CSS (`.css`)

| Prefix | Expands to |
| :-- | :-- |
| `swc-host` | `:host { display: block; }` |

---

## JSON Schemas

The schemas are hosted on GitHub and bundled into the VS Code extension. If you use a different editor that supports JSON Schema, add a `$schema` field to your manifests pointing at the raw GitHub URLs — your editor will fetch and cache them automatically.

**`component.json`:**

```json
{
    "$schema": "https://raw.githubusercontent.com/Tumas2/swc/main/schemas/component.schema.json",
    "name": "my-card",
    "version": "1.0.0",
    "stores": []
}
```

**Store manifest:**

```json
{
    "$schema": "https://raw.githubusercontent.com/Tumas2/swc/main/schemas/store.schema.json",
    "id": "cartStore",
    "state": {}
}
```

The CLI generates these fields automatically when you run `create component` or `create store`. If you're adding them by hand, copy the URLs above verbatim — they work regardless of where your project lives.

---

[← SSR](../ssr/README.md) | [Next: API Reference →](../api/README.md)
