# NanoRenderer — Template Syntax

`NanoRenderer` is a tiny built-in template engine that adds `{{ mustache }}`-style syntax to SWC components. It is entirely optional — use it when plain JS template literals aren't enough.

## Setup

There are two ways to use NanoRenderer.

### Option A — `NanoRenderStatefulElement` (recommended)

Import the convenience base class. Your component works exactly like a normal `StatefulElement` but with NanoRenderer pre-wired.

```javascript
import { NanoRenderStatefulElement } from './src/js/NanoRenderer.js';

class MyCounter extends NanoRenderStatefulElement {
    getStores() {
        return { counter: counterStore };
    }

    view() {
        return `<span>Count: {{ counter.count }}</span>`;
    }
}
```

### Option B — override `getRenderer()`

Use this when you want a project-wide base class that enables NanoRenderer for all your components:

```javascript
// swc.js — your project's base class
import { StatefulElement } from './src/js/StatefulElement.js';
import { NanoRenderer } from './src/js/NanoRenderer.js';

const nano = new NanoRenderer();

export class AppElement extends StatefulElement {
    getRenderer() {
        return nano.render;
    }
}
```

```javascript
// my-counter/component.js
import { AppElement } from '../../swc.js';

class MyCounter extends AppElement { ... }
```

---

## Template Context

Templates receive a merged context of `this.state` (all stores) and the return value of `computed()`. Access values by their store key:

```
{{ counter.count }}      ← from getStores() { return { counter: ... } }
{{ user.fullName }}      ← from computed() { return { user: { fullName: ... } } }
```

---

## Syntax Reference

### Interpolation

```html
{{ user.name }}          — safe (HTML-escaped)
{{{ user.bio }}}         — raw HTML (unescaped, use with trusted data only)
{{ user.status || "Offline" }}  — fallback value
```

### Conditionals

```html
{{#if user.loggedIn}}
    <p>Welcome back!</p>
{{else}}
    <p>Please log in.</p>
{{/if}}
```

The `{{else}}` block is optional.

### Loops

Iterates over an array. Inside the block, the current item's properties are in scope directly. `{{ this }}` refers to the item itself, and `{{ index }}` is the zero-based position.

```html
<ul>
    {{#each skills.items}}
        <li>{{ this.name }} ({{ index }})</li>
    {{/each}}
</ul>
```

Access nested properties on the current item:
```html
{{#each users.list}}
    <p>{{ this.profile.bio }}</p>
{{/each}}
```

---

## Full Example

```javascript
import { NanoRenderStatefulElement } from './src/js/NanoRenderer.js';
import { StateStore } from './src/js/store.js';

const skillsStore = new StateStore({
    items: [
        { name: 'JavaScript', level: 'Expert' },
        { name: 'PHP', level: 'Advanced' },
    ],
});

class SkillsList extends NanoRenderStatefulElement {
    getStores() {
        return { skills: skillsStore };
    }

    view() {
        return `
            {{#if skills.items}}
                <ul>
                    {{#each skills.items}}
                        <li>{{ this.name }} — {{ this.level }}</li>
                    {{/each}}
                </ul>
            {{else}}
                <p>No skills found.</p>
            {{/if}}
        `;
    }
}

customElements.define('skills-list', SkillsList);
```
