# SWC - AI Context & Documentation

## Project Overview
SWC (Stateful Web Components) is a pure Vanilla JavaScript library for building state-driven, reactive Web Components without external dependencies. It utilizes standard Web APIs like Custom Elements, Shadow DOM, and native Modules.

## Key Architecture

### 1. Component System (`StatefulElement`)
- **Base Class**: All components extend `StatefulElement` (inherits from `HTMLElement`).
- **Shadow DOM**: Uses `open` mode Shadow DOM for encapsulation. styles are applied via `adoptedStyleSheets` in `getStyles()`.
- **Rendering**:
    - **Templates**: Can be defined inline via `view()` or loaded externally via `getTemplatePath()`.
    - **Reactivity**: Uses a morphing algorithm (`dom-morph.js`) to update the DOM efficiently without full re-renders.
    - **Renderer**: Supports custom renderers via `getRenderer()`. Defaults to a raw string injector but `NanoRenderer` can be used for template interpolation.

### 2. State Management (`StateStore`)
- **Pattern**: Pub/Sub architecture.
- **Integration**: Components define dependent stores in `getStores()`.
- **Reactivity**: `StatefulElement` automatically subscribes to these stores and triggers `render()` on state changes.
- **Methods**: `getState()`, `setState()`, `resetState()`, `subscribe()`, `unsubscribe()`.

### 3. DOM Morphing & Events
- **Morphing**: Updates DOM nodes in place to preserve state (focus, selection).
- **Event Binding**:
    - **Convention**: Use `on*` attributes in your HTML templates (e.g., `onclick="handleClick"`).
    - **Magic**: `StatefulElement` automatically converts these to `data-swc-event-*` and binds them to the component instance's methods (e.g., `this.handleClick`).
    - **Stability**: Event listeners are managed and cleaned up automatically.

## Utilities (Optional)

### Router (`router/`)
*Note: This is an extra utility/module and not part of the core library.*
- **Declarative**: Uses custom elements for routing structure.
- **Components**:
    - `<router-container base-path="...">`: Root container.
    - `<router-switch>`: Renders the first matching route.
    - `<router-route path="..." src="...">`: Defines a route. Supports lazy loading HTML via `src`.
    - `<router-link to="...">`: Intercepts clicks for seamless navigation.
- **Backend Integration**: Designed to work with PHP or other backends by checking `base-path` and handling initial server-side renders if needed.

## Coding Conventions

- **No Build Step**: Code should be valid ES modules runnable directly in the browser.
- **File Structure**:
    - `src/`: Core library code.
    - `test/`: Usage examples and testing playground.
- **Imports**: Use full relative paths with extensions (e.g., `import ... from './file.js'`).
- **CSS**: Define styles in `getStyles()` returning `CSSStyleSheet` objects constructed from text.

## Use Cases
- Components should be self-contained.
- Routing logic is handled by the `router/` components but fits within the standard component model.
- External HTML templates are supported for complex views to keep JS clean.

## Testing
- **Location**: `test/` directory.
- **Structure**: Each folder within `test/` represents a separate isolated project/test case.
- **Run**: Serve the root via a web server (e.g., Apache/PHP).
    - **Test Root**: `http://swc.test:8080/test/`
    - **Specific Test Example**: `http://swc.test:8080/test/php-routing` (for routing components).
- **Method**: Currently manual/visual verification in the browser.

## Best Practices

When building components, follow the "Folder-per-Component" pattern to ensure modularity and clean separation of concerns.

### Component Structure
Each component should live in its own directory (e.g., `components/user-greeting/`) containing:
- `component.js`: Class definition and logic.
- `markup.html`: The HTML template (if not using inline `view()`).
- `style.css`: Component-specific styles.

### Example: `user-greeting`

**File Tree:**
```
test/php-routing/components/user-greeting/
├── component.js
├── markup.html
└── style.css
```

**Implementation Pattern (`component.js`):**
```javascript
import { NanoRenderStatefulElement } from 'swc';
import { userStore } from '../../stores/userStore.js';
import componentStyle from './style.css' with { type: 'css' }; // Import CSS module

class UserGreeting extends NanoRenderStatefulElement {

    // 1. encapsulated styles
    getStyles() {
        return [componentStyle];
    }

    // 2. External template path (resolved relative to current file)
    getTemplatePath() {
        return new URL('markup.html', import.meta.url).pathname;
    }

    // 3. Initial local state/data
    computed() {
        return {
            person: { name: "Alex", isAdmin: true }
        };
    }

    // 4. Connect to global stores
    getStores() {
        return {
            user: userStore,
        };
    }
}

customElements.define('user-greeting', UserGreeting);
```

### Key Principles
1.  **Separation**: Keep logic, view, and style in separate files for maintainability.
2.  **CSS Modules**: Use `import ... with { type: 'css' }` for native CSS module support.
3.  **Relative Paths**: Use `import.meta.url` to resolve paths for external assets like templates.
4.  **Store Connection**: explicit dependency injection via `getStores()`.

## Server-Side Rendering (SSR)

SWC is designed to work seamlessly with server-side rendering (e.g., PHP, Node.js) to improve SEO and First Contentful Paint (FCP).

### Mechanism
Any SWC component can be server-side rendered. If the server outputs HTML inside the custom element, the component can be designed to use that as its initial content/template. This eliminates the "pop-in" effect and ensures content is visible immediately.

### Implementation Pattern (PHP Example)
1.  **Backend Check**: Determine what content should be visible (e.g., based on URI or state).
2.  **Inject Content**: Output the HTML directly inside the component tags.

#### Example: Routing
The `<router-route>` component is a common use case where content is conditionally rendered by the server based on the path.

```php
<router-switch>
    <!-- Simple Route: Strict Match -->
    <router-route path="/" src="./pages/home-page.html">
        <?php 
        if ($_SERVER['REQUEST_URI'] === $base_url . '/') {
            echo file_get_contents(__DIR__ . '/pages/home-page.html');
        } 
        ?>
    </router-route>

    <!-- Dynamic/Wildcard Route: Prefix Match -->
    <router-route path="/users/*" src="./pages/users-page.html">
        <?php 
        if (strpos($_SERVER['REQUEST_URI'], $base_url . '/users') === 0) {
            echo file_get_contents(__DIR__ . '/pages/users-page.html');
        } 
        ?>
    </router-route>
</router-switch>
```
