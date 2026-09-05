# Context

A component nested inside another can inherit a store from it, plus a little
config, without either one hardcoding the other. That lets you write a component
once and drop it into several different hosts.

Context is declared in the manifest, not in code. The parent names what it hands
down; the child names what it wants.

---

## The problem it solves

Say two parts of your app both need a date picker. One reads meals, the other
reads workouts. The picker is the same in both — the same popover, the same
month grid, the same behaviour. Only the data differs.

Without context you have two options, and both are bad. Hardcode a store in the
picker and it only works in one place. Pass everything in through attributes and
you are serialising your state to strings.

Context gives the picker a third option: declare that it needs *a* store, and
let whoever hosts it decide which one.

---

## Providing

A parent declares `provides` as a map of alias to value:

```json
{
    "name": "meal-planner",
    "version": "1.0.0",
    "stores": ["mealStore"],
    "components": ["date-picker"],
    "provides": {
        "data": "mealStore",
        "loggedKey": "days"
    }
}
```

Two kinds of value are allowed:

| Value | Behaviour |
|---|---|
| A registered store id | Resolved to the live store. The child subscribes to it and re-renders when it changes. |
| Anything else | Passed down as a plain config value. |

`"mealStore"` resolves because a store with that id was registered with
`createStore`. `"days"` does not match any store id, so it arrives as the string
it is.

## Using

A child opts in by listing the aliases it wants:

```json
{
    "name": "date-picker",
    "version": "1.0.0",
    "uses": ["data", "loggedKey"]
}
```

Both land on state under their alias:

```javascript
computed(state) {
    // `data` is the inherited store's state.
    // `loggedKey` is the inherited string.
    const bucket = state.data?.[state.loggedKey] ?? {};

    return { dates: Object.keys(bucket).sort() };
}
```

Note what is *not* in that file: any mention of meals. Drop the same component
inside a host that provides `workoutStore` and `"workouts"`, and it reads
workouts instead. No branching, no subclass.

---

## How resolution works

The child walks up the DOM looking for the nearest ancestor whose manifest
provides the alias it wants. The walk crosses shadow boundaries, so nesting a
component inside a parent's shadow root works exactly like nesting it in light
DOM.

The search starts one level above the component, so a component that both
provides and uses the same alias will never resolve to itself — it inherits from
further up, which is what you want for a component that decorates a value on its
way down.

**Nearest ancestor wins.** If two ancestors both provide `data`, the closer one
is used.

**Timing is not a concern.** A child inside a parent's shadow root exists only
because the parent rendered it, so the parent is fully live before the child
connects. There is nothing to wait for and no retry to write.

**A missing provider is not fatal.** If nothing above provides the alias, the
component warns once per unresolved alias and renders without it. Write your
`computed()` so it survives that — the `?? {}` in the example above is not
decoration.

---

## Sending data back up

Context flows one way. To send something back, dispatch an event:

```javascript
$pickDay(e) {
    this.dispatchEvent(new CustomEvent('date-change', {
        detail: { date: e.currentTarget.dataset.date },
        bubbles: true,
        composed: true,
    }));
}
```

`composed: true` is required — without it the event stops at the shadow
boundary and the host never sees it.

**Stores and config down, events up.** Keeping to that rule is what lets the
whole graph stay declarative, since a manifest can hold a store id or a string
but never a function.

---

## Why the manifest

Manifest declarations are the only ones a server-side renderer can read without
executing JavaScript. Because `provides` and `uses` name a *relationship* rather
than an instance, the same declaration resolves on the client by walking the DOM
and on the server by walking the manifest graph — parents already declare both
their `stores` and their `components`.

That is also why provided values must stay serialisable. A manifest holds a
store id, never a store.

---

## How it merges with your other stores

A component's stores come from three places, merged by key:

1. `getStores()` — resolved at runtime, lowest precedence
2. Inherited context — the aliases in `uses`
3. `stores` in the manifest — wins any key collision

Using more than one source is normal and silent. The manifest wins collisions
because it is the declaration SSR depends on, and only a genuine collision on
the same key warns.

So this is fine, and does what it looks like:

```javascript
const meta = {
    name: 'workout-panel',
    version: '1.0.0',
    stores: ['workoutStore'],
};

class WorkoutPanel extends StatefulElement {
    getManifest() { return meta; }

    // Merged with workoutStore above, not discarded.
    getStores() { return { ui: localUiStore }; }
}
```

Reach for `getStores()` when a store genuinely cannot be named ahead of time.
Anything static belongs in the manifest, where the server can see it.

---

## Loading nested components

A component inside another's shadow root is invisible to lazy discovery — the
MutationObserver only watches light DOM. Declare it in the parent's manifest so
it loads with its host:

```json
"components": ["date-picker"]
```

See [Components](../components/README.md) for the full loading story.

---

[← Back to State](../state/README.md) · [Next: Templates →](../templates/README.md)
