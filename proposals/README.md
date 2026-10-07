# Proposals

Work in progress. Design notes, half-formed ideas, and things being argued out
before they become code.

**This is not user documentation.** `docs/` is what people read to learn the
library, and everything in it describes behaviour that actually exists. Nothing
here is promised, shipped, or safe to rely on.

A proposal graduates by being implemented and written up in `docs/` — at which
point the file here gets deleted or marked superseded.

| # | Title | Status |
|---|---|---|
| 001 | [Context in SSR](001-component-context.md) | Done — documented in `docs/ssr/php` |

## Ideas not yet written up

- **File-based render entry point (PHP).** `NanoRenderer::set_cache_dir()` keys
  cached templates by a hash of their text, so each request still reads and
  hashes every template file (~0.13 ms for six templates outside OPcache, in
  the CMS benchmark). A `render_file($path, $data)` keyed by real path and
  modification time could skip both on cache hits. Not needed at current
  sizes; worth it only if templates with many partials show the cost.
