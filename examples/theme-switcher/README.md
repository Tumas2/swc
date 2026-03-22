# Theme Switcher

**What it shows:** One store update propagating to every subscribed component at once.
A single toggle button switches all cards between light and dark mode simultaneously — no
events, no callbacks, just the store.

## Key concepts

- Multiple components subscribing to the same store
- CSS class switching based on store state (inside Shadow DOM)
- How global UI state (theme, locale, auth) flows through the store layer

## How to run

```bash
php -S localhost:8080
```

Open `http://localhost:8080` and click the toggle.

## Files

```
theme-switcher/
├── index.html
├── swc.js
├── stores/
│   └── theme-store.json
└── components/
    ├── stores.js
    ├── index.js
    ├── theme-toggle/        ← button; calls themeStore.setState()
    └── app-card/            ← subscribes to themeStore; switches CSS class
```
