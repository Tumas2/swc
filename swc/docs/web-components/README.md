# Web Components

SWC is built on Web Components — a set of browser APIs that let you define your own HTML elements. This is not a framework abstraction. These are platform standards supported by every modern browser.

Understanding what Web Components are helps explain why SWC works the way it does.

---

## Custom Elements

The [Custom Elements API](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements) lets you define new HTML tags backed by a JavaScript class.

```javascript
class MyGreeting extends HTMLElement {
    connectedCallback() {
        this.textContent = 'Hello!';
    }
}

customElements.define('my-greeting', MyGreeting);
```

```html
<my-greeting></my-greeting>
```

The browser treats `<my-greeting>` like any other element — it appears in the DOM, you can style it, query it, and nest it. `StatefulElement` extends `HTMLElement` the same way, adding reactivity on top.

---

## Shadow DOM

The [Shadow DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) gives each component a private, isolated subtree. Styles defined inside a Shadow DOM don't leak out to the page, and page styles don't bleed in.

This is why you can write a component with a `.button` style and never worry about it conflicting with another component's `.button`. Each component's DOM is genuinely separate.

SWC attaches a Shadow DOM automatically when your component connects to the page. You never need to call `attachShadow()` yourself.

---

## Why SWC uses Web Components

Most UI frameworks invent their own component model — a virtual DOM, a rendering runtime, a proprietary way to scope styles. Web Components are the browser's own answer to the same problem.

Building on them means:

- **Nothing to ship.** The component system is already in the browser. SWC only adds the reactive layer on top.
- **No lock-in.** A custom element registered with `customElements.define()` works anywhere — inside a React app, a Vue app, or a plain HTML file.
- **Standards last.** The APIs SWC uses today were designed for the long term. Code written against them will keep working.

---

## Further reading

- [MDN: Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- [MDN: Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

---

[← Getting Started](../getting-started/README.md) | [Next: Components →](../components/README.md)
