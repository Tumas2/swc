# Form Preview

**What it shows:** Two components sharing a store where one writes and one reads. Typing
in the form updates the live preview instantly — no events between components, no callbacks,
just the store.

## Key concepts

- Events (`oninput="$updateField"`) updating store state on every keystroke
- `computed()` deriving display values (initials, fallback text) from raw state
- One component writing, one reading — the classic reactive data flow pattern

## How to run

```bash
php -S localhost:8080
```

Open `http://localhost:8080` and start typing in the form.

## Files

```
form-preview/
├── index.html
├── swc.js
├── stores/
│   └── profile-store.json
└── components/
    ├── stores.js
    ├── index.js
    ├── profile-form/      ← writes to profileStore on every input event
    └── profile-preview/   ← reads profileStore; computed() derives display values
```
