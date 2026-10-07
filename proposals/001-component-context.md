# 001 — Context in SSR

**Status:** Implemented on branch `php-ssr-fixes` (not merged). Docs pending — tracked in [002](002-ssr-and-template-docs.md).
**Affects:** `ComponentRegistry`, `Component`

> **Outcome.** `ComponentRegistry` now renders nested components recursively and
> resolves `uses` from the nearest ancestor's `provides`, mirroring the client
> (manifest `stores` win collisions; plain values never shadow a store). The open
> questions below were settled as:
> 1. **Depth limit:** 32 levels, then a warning and the element is left unrendered.
> 2. **Where substitution happens:** after interpolation, by scanning the rendered
>    HTML for registered tags (`Markup`), so each child's `{{ }}` resolves against
>    its own data.
> 3. **`light_dom` / `host_attrs`:** children written inside a template are
>    rendered in place with the same context; host attributes are passed to the
>    `set_computed()` callback. `light_dom` passed to `render()` is inserted as-is.
>
> The rest of this file is the original draft, kept for the reasoning.

> The PHP renderer is an intentional sketch, not a lagging implementation. It was
> built to keep server-side rendering in view and to let experiments there shape
> the client design — then deliberately left alone while the JavaScript side, the
> main thing, kept moving. It is out of sync with the client by choice. Read
> anything below about what the server "does not do" as *not built yet*, not as
> broken.

---

## Origin

This started as a full proposal for component context — letting a parent hand a
store and some config down to nested children, so a component could be written
once and behave differently depending on its host. Modelled on WordPress
`block.json` and its `providesContext` / `usesContext` pair.

The client half is built and shipped. A parent declares `provides` in its
manifest, a child declares `uses`, and the child resolves it by walking up the
DOM across shadow boundaries. That behaviour is documented in
[`docs/context/`](../docs/context/README.md), which is the reference now.

What was always the second half — resolving the same declarations on the server
— is what remains, and is all this document is about.

### Why the manifest carries it

Worth preserving, because it constrains everything below. Context lives in the
manifest rather than in code because a manifest is the only declaration a PHP
renderer can read without executing JavaScript. `provides` and `uses` name a
*relationship*, not an instance, so one declaration can resolve two ways: by
walking the DOM on the client, by walking the manifest graph on the server.

That is also why a provided value must stay serialisable — a store id or a
string, never a store or a function. The client could pass live references; it
deliberately does not, so the server can resolve the same thing.

### Why `provides` / `uses` and not `providesContext` / `usesContext`

The existing manifest keys are all short nouns — `name`, `version`, `stores`,
`components` — and the longer pair sits badly beside them. More substantively,
the semantics differ from WordPress: WP context carries resolved values and
re-renders the subtree, while this passes a live store the child subscribes to.
Borrowing the exact name would import the wrong expectation.

---

## What the server does today

`ComponentRegistry::discover()` reads every `manifest.json` under its base
folder into `$this->metas`, keyed by tag name. `render($tag)` then calls
`build_data($tag)`, which looks up that manifest's `stores` array in the
`StoreRegistry` and passes the result to `Component::render()`.

`Component::render()` interpolates the template and wraps it in a Declarative
Shadow DOM `<template>`.

## The blocker

**Rendering is not recursive.** `Component::render()` runs the template through
`NanoRenderer` and stops. A nested component tag in that template comes out as
an empty element — the server never looks at it, never resolves its stores, and
never renders its shadow root. It stays blank until JavaScript upgrades it.

So server-side context resolution is not a feature that can be added on its own.
Nested components are not server-rendered at all today, and context is a
sub-problem of making them so. Whenever this gets picked up, it starts with
recursion, not with `provides`.

That also lowers the urgency. Context costs nothing on the server right now
because nothing downstream of a host is rendered there anyway.

## The part that is already solved

When recursion does get built, resolution should be straightforward: the static
graph exists. Every manifest declares both the stores it needs and the child
components it renders, and `discover()` has already loaded all of them into
`$this->metas` before any rendering starts.

Resolving a child's `uses` is then a lookup against the ancestor chain the
renderer is already walking — it knows which component it is inside, because it
got there by rendering that component's template.

## Sketch

1. `Component::render()` gains a pass over its rendered output that finds child
   custom-element tags the registry knows about.
2. For each, the registry renders that child and substitutes the result,
   carrying a context frame down: the merged `provides` of every ancestor so
   far, nearest winning.
3. `build_data()` takes that frame and resolves the child's `uses` from it —
   store ids through `StoreRegistry`, anything else passed through as a literal.

Nearest-ancestor-wins must match the client, or SSR output and first client
render disagree and the morph is no longer a no-op.

## Open questions

1. **Cycle and depth limits.** The client terminates naturally because a
   component only renders children that exist in the DOM. A server-side walk
   over templates has no such bound and needs an explicit one.

2. **Where the substitution happens.** Post-processing rendered HTML means
   parsing it back. Doing it before interpolation means the child's own
   `{{ }}` placeholders are resolved against the wrong data. Neither is
   obviously right.

3. **Whether `light_dom` and `host_attrs` should flow down too.** They are
   render-time arguments today, not manifest declarations, so they have no
   static form for the server to read.
