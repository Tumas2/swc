# SWC — Stateful Web Components

SWC is a small JavaScript library for building reactive web components. No build tools, no dependencies, no framework lock-in — just modern browser APIs.

## Why does this exist?

Most UI libraries come with a cost: a build pipeline, a runtime to ship, a framework to commit to, and a growing list of dependencies to maintain. SWC started as an experiment to see how far modern JavaScript could go without any of that.

**Three goals drove it:**

- **No build tools.** Browsers understand ES modules natively. There is no reason a library should require a bundler to run.
- **No dependencies.** Every dependency is a maintenance burden and a potential security surface. SWC has zero — on both the JS and PHP sides.
- **Small but expandable.** The core is a few hundred lines. You only add what you need — the template renderer, the router, the SSR package are all opt-in.

The result is a library that feels like writing plain JavaScript, because it mostly is. You get reactivity, scoped styles, and DOM diffing — all built on web standards that will still work ten years from now.

## What it does

- Reactive components built on the [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) standard
- A simple pub/sub state store that re-renders components automatically
- In-place DOM diffing so updates are efficient without a virtual DOM
- An optional `{{ mustache }}` template renderer
- An optional client-side router
- An optional PHP package for server-side rendering

## Documentation

Read the [docs](docs/README.md) to get started.
