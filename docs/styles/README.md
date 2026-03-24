# Styles

SWC components use Shadow DOM, which means their styles are fully scoped. CSS you write for one component cannot affect another component, and page-level styles cannot bleed in. You never need to worry about class name collisions.

Styles are applied via the browser's native `adoptedStyleSheets` API — no `<style>` tags injected into the DOM, no style attribute pollution.

---

## Adding styles to a component

Return an array of `CSSStyleSheet` objects from `getStyles()`. The recommended way is to import a CSS file directly as a [CSS Module Script](https://web.dev/css-module-scripts/) — your editor gets proper CSS syntax support, and the browser caches the stylesheet so it is only parsed once no matter how many instances of the component exist on the page.

```javascript
// my-button/component.js
import styles from './style.css' with { type: 'css' };

class MyButton extends StatefulElement {
    getStyles() {
        return [styles];
    }

    view() {
        return `<button onclick="$handleClick"><slot></slot></button>`;
    }
}
```

```css
/* my-button/style.css */
:host {
    display: inline-block;
}

button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background: #0070f3;
    color: white;
}

button:hover {
    background: #005bb5;
}
```

`:host` refers to the component's own element — use it to control how the component itself sits in the layout.

### Inline styles

For quick prototyping or very small components, you can define styles inline without a separate file:

```javascript
class MyButton extends StatefulElement {
    getStyles() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`:host { display: inline-block; }`);
        return [sheet];
    }
}
```

---

## Composing multiple stylesheets

`getStyles()` returns an *array*, which means a component can use as many stylesheets as it needs. This is useful for sharing design tokens, animations, or base styles across components without duplicating them.

A common pattern is to have a project-wide `tokens.css` that defines variables and a `base.css` with common reset or utility rules, then each component adds its own stylesheet on top:

```javascript
// shared/tokens.css
:host {
    --color-primary: #0070f3;
    --color-text: #111;
    --spacing-md: 1rem;
    --radius: 4px;
}
```

```javascript
// shared/animations.css
@keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

```javascript
// my-card/component.js
import tokens from '../shared/tokens.css' with { type: 'css' };
import animations from '../shared/animations.css' with { type: 'css' };
import styles from './style.css' with { type: 'css' };

class MyCard extends StatefulElement {
    getStyles() {
        return [tokens, animations, styles];
    }
}
```

Each stylesheet in the array is applied in order. The component's own `style.css` comes last so it can override anything from the shared sheets.

Because the browser caches `CSSStyleSheet` objects, `tokens.css` and `animations.css` are parsed once no matter how many components include them.

---

## Styling from outside (CSS Parts)

Shadow DOM blocks outside styles by design, but sometimes a component needs to expose styling hooks — for example, letting the page theme a navigation link's active state. The CSS `part` attribute and `::part()` selector handle this.

A component marks elements it wants to expose:

```html
<a part="link">Home</a>
<a part="link link--active">About</a>
```

The page (or parent component) can then style them:

```css
my-nav::part(link) {
    color: inherit;
    text-decoration: none;
}

my-nav::part(link--active) {
    font-weight: bold;
    border-bottom: 2px solid currentColor;
}
```

SWC's [Router](../router/README.md) uses this pattern for active navigation links.

---

[← Templates](../templates/README.md) | [Next: Events →](../events/README.md)
