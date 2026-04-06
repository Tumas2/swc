# Events

SWC handles event binding automatically. Write `onclick="$methodName"` in your template and SWC wires it to the matching method on your class. No `addEventListener`, no `.bind(this)`, no cleanup needed.

---

## Basic usage

Use standard HTML event attributes — `onclick`, `oninput`, `onsubmit`, etc. The value is the name of a method on your component class, prefixed with `$`, without parentheses.

```javascript
class MyButton extends StatefulElement {
    view() {
        return `<button onclick="$handleClick">Click me</button>`;
    }

    $handleClick(event) {
        console.log('clicked', event.target);
    }
}
```

The handler receives the native `Event` object. Everything you'd normally do with it — `event.preventDefault()`, `event.target`, `event.currentTarget` — works as expected.

### The `$` prefix

All template-callable methods must be prefixed with `$`. This keeps them visually distinct from lifecycle methods (`view`, `onMount`, etc.) and prevents accidental collisions with SWC's own API. If you forget the `$`, SWC logs a warning and does not bind the handler:

```
SWC: <my-button> — handler "handleClick" must be prefixed with $ to be callable from a template (e.g. $handleClick).
```

---

## Form inputs

Use `oninput` or `onchange` for form fields:

```javascript
class SearchBox extends StatefulElement {
    getStores() {
        return { search: searchStore };
    }

    view() {
        return `
            <input
                type="text"
                value="${this.state.search.query}"
                oninput="$handleInput"
                placeholder="Search..."
            />
        `;
    }

    $handleInput(event) {
        searchStore.setState({ query: event.target.value });
    }
}
```

---

## Preventing default behaviour

Call `event.preventDefault()` inside your handler as you normally would:

```javascript
class MyForm extends StatefulElement {
    view() {
        return `
            <form onsubmit="$handleSubmit">
                <input type="text" name="email" />
                <button type="submit">Submit</button>
            </form>
        `;
    }

    $handleSubmit(event) {
        event.preventDefault();
        const data = new FormData(event.target);
        // handle form data...
    }
}
```

---

## How it works

When SWC renders HTML, it scans for `on*` attributes and converts them to stable `data-swc-event-*` attributes before the DOM is updated. After each render, it walks the Shadow DOM and attaches event listeners for each one. When the component re-renders, old listeners are removed and new ones are attached.

This approach means the DOM stays clean and inspectable, listeners never pile up, and you never have to think about cleanup.

---

## Debugging tip: DevTools may show the wrong `e.target`

If your component is rendered inside another component's shadow root (for example, a `<weather-widget>` inside a `<router-switch>`), you may notice a confusing discrepancy when you log an event object:

```javascript
$handleClick(event) {
    console.log(event);         // DevTools shows: target: router-switch ← misleading
    console.log(event.target);  // Logs the actual element: <button id="search-btn"> ← correct
}
```

This is a **Chrome DevTools display artifact**, not a bug in your code. When DevTools serializes the event object for display, it reads the properties from its own inspector context — which lives outside all shadow roots. Shadow DOM's retargeting algorithm then resolves `event.target` to the outermost shadow host visible from that context.

When you access `event.target` directly in JavaScript, retargeting is evaluated relative to your handler's scope (inside the shadow root), so you get the actual element every time.

**Rule of thumb:** always read `event.target` in code — never rely on the collapsed event object view in DevTools when shadow DOM is involved.

If you ever need a guaranteed reference to the exact element the event originated from (regardless of shadow boundaries), use `event.composedPath()[0]`:

```javascript
$handleClick(event) {
    const origin = event.composedPath()[0]; // always the actual element
}
```

For most cases `event.target` is sufficient, but `composedPath()[0]` is the bulletproof alternative.

---

## Supported events

Any event attribute the browser supports works — `onclick`, `oninput`, `onchange`, `onsubmit`, `onfocus`, `onblur`, `onkeydown`, `onmouseover`, and so on. If the browser fires it and you can put it on an element as an attribute, SWC will bind it.

---

[← Styles](../styles/README.md) | [Next: Router →](../router/README.md)
