<?php

declare(strict_types=1);

namespace SWC;

/**
 * Auto-discovers SWC components from folders by reading each manifest.json
 * and manages rendering with optional StoreRegistry integration.
 *
 * Usage:
 *   $components = new ComponentRegistry(
 *       fs_base:  __DIR__ . '/components',
 *       web_base: '/swc/test/portfolio/components',
 *       stores:   $store_registry,   // optional
 *   );
 *   $components->add_path(__DIR__ . '/plugins/gallery/components', '/plugins/gallery/components');
 *
 *   echo $components->preload_tags();           // <link rel="preload"> for each style.css
 *   echo $components->script_tags();           // <script type="module"> for each component.js
 *   echo $components->render('work-history');  // renders with state from StoreRegistry
 *   echo $components->render('site-nav');      // renders with no state (static)
 *
 * When $stores is provided, ComponentRegistry:
 *   - Automatically passes each component's required stores (from manifest.json "stores" array)
 *   - Resolves context: "uses" aliases from the nearest ancestor that "provides" them
 *   - Emits a warning if a required store has no state
 *
 * Nested components: any registered tag that appears in a component's
 * rendered markup is rendered too, recursively, so the whole tree arrives
 * server-rendered. Light DOM passed to render() is inserted as-is — render
 * it with this registry first.
 *
 * Individual components can still be used directly via new Component() if needed.
 */
class ComponentRegistry
{
    /** Stops runaway recursion, e.g. a component that contains itself. */
    private const MAX_DEPTH = 32;

    /** @var array<string, Component> Keyed by tag name. */
    private array $components = [];

    /** @var array<string, array> manifest.json metadata, keyed by tag name. */
    private array $metas = [];

    /** @var array<string, callable> computed() equivalents, keyed by tag name. */
    private array $computed = [];

    private ?StoreRegistry $stores;

    /**
     * @param string             $fs_base  Filesystem base path containing component sub-folders.
     * @param string             $web_base Web-accessible base URL for components.
     * @param StoreRegistry|null $stores   Optional store registry for automatic state injection.
     */
    public function __construct(
        string $fs_base,
        string $web_base,
        ?StoreRegistry $stores = null,
    ) {
        $this->stores = $stores;
        $this->add_path($fs_base, $web_base);
    }

    /**
     * Discovers components from another folder, e.g. one per plugin or theme.
     * A tag name that is already registered keeps its first definition, just
     * like customElements.define() refuses to redefine a tag.
     *
     * @param string $fs_base  Filesystem base path containing component sub-folders.
     * @param string $web_base Web-accessible base URL for those components.
     */
    public function add_path(string $fs_base, string $web_base): void
    {
        $this->discover(rtrim($fs_base, '/'), rtrim($web_base, '/'));
    }

    /**
     * Registers the server-side equivalent of a component's JS computed().
     * The callback receives the component's data (store state keyed by store
     * id, plus context) and its host attributes, and returns values to merge
     * on top — the same shape JS computed() returns.
     *
     * Runs for every render of the tag, including nested renders.
     *
     * @param string   $tag_name
     * @param callable $callback fn(array $data, array $host_attrs): array
     */
    public function set_computed(string $tag_name, callable $callback): void
    {
        $this->computed[$tag_name] = $callback;
    }

    /**
     * Renders a component by tag name to an HTML string.
     *
     * @param string $tag_name   The custom element tag name (e.g. 'work-history').
     * @param array  $host_attrs Extra attributes on the host element (e.g. ['slot' => 'history']).
     * @param string $light_dom  HTML injected as light DOM children (for slotted content), inserted as-is.
     * @param array  $data       Extra template data, merged on top of store state.
     * @param bool   $shadow     true for Declarative Shadow DOM, false for flattened light DOM.
     * @return string
     */
    public function render(
        string $tag_name,
        array $host_attrs = [],
        string $light_dom = '',
        array $data = [],
        bool $shadow = true,
    ): string {
        if (!isset($this->components[$tag_name])) {
            return "<!-- SWC: component '{$tag_name}' not found -->";
        }

        $attr_str = Component::attributes_to_string($host_attrs);

        return $this->render_element(
            $tag_name,
            $attr_str,
            Markup::parse_attributes($attr_str),
            $light_dom,
            $data,
            [],
            $shadow,
            0,
        );
    }

    /**
     * Returns true if a component with this tag name was discovered.
     *
     * @param string $tag_name
     * @return bool
     */
    public function has_component(string $tag_name): bool
    {
        return isset($this->components[$tag_name]);
    }

    /**
     * Returns a <link rel="preload"> tag for every discovered component's stylesheet.
     * Place in <head> to ensure CSS is fetched before DSD templates are parsed.
     *
     * @return string
     */
    public function preload_tags(): string
    {
        $out = '';
        foreach ($this->components as $component) {
            $out .= $component->preload_tag() . "\n";
        }
        return $out;
    }

    /**
     * Returns a <script type="module"> tag for every discovered component's JavaScript file.
     * Place in <head> to register all custom elements before the page body is parsed.
     *
     * @return string
     */
    public function script_tags(): string
    {
        $out = '';
        foreach ($this->components as $component) {
            $out .= $component->script_tag() . "\n";
        }
        return $out;
    }

    /**
     * Returns the raw Component object for a tag name, or null if not found.
     * Useful for rendering with custom data outside the StoreRegistry.
     *
     * @param string $tag_name
     * @return Component|null
     */
    public function get_component(string $tag_name): ?Component
    {
        return $this->components[$tag_name] ?? null;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /**
     * Scans $fs_base for sub-folders that contain a manifest.json file.
     *
     * @param string $fs_base
     * @param string $web_base
     */
    private function discover(string $fs_base, string $web_base): void
    {
        foreach (glob($fs_base . '/*/manifest.json') ?: [] as $file) {
            $meta = json_decode(file_get_contents($file), true);
            if (!is_array($meta) || !isset($meta['name'])) {
                continue;
            }

            $dir  = dirname($file);
            $name = $meta['name'];

            if (isset($this->components[$name])) {
                trigger_error("SWC ComponentRegistry: component '{$name}' in '{$dir}' is already registered. Keeping the first one.", E_USER_WARNING);
                continue;
            }

            $this->metas[$name]      = $meta;
            $this->components[$name] = new Component(
                fs_path:  $dir,
                web_path: $web_base . '/' . basename($dir),
                tag_name: $name,
                version:  $meta['version'] ?? '',
            );
        }
    }

    /**
     * Renders one component, then every registered component nested in its
     * markup, and wraps the result in the host element.
     *
     * @param string $tag_name
     * @param string $attr_str   Host attribute string, emitted verbatim.
     * @param array  $host_attrs Decoded host attributes, passed to computed callbacks.
     * @param string $light_dom  Host children, emitted as-is.
     * @param array  $extra_data Caller data merged on top of store state.
     * @param array  $context    Aliases provided by ancestors: alias => store id or value.
     * @param bool   $shadow
     * @param int    $depth
     * @return string
     */
    private function render_element(
        string $tag_name,
        string $attr_str,
        array $host_attrs,
        string $light_dom,
        array $extra_data,
        array $context,
        bool $shadow,
        int $depth,
    ): string {
        $component = $this->components[$tag_name];
        $data      = $this->build_data($tag_name, $host_attrs, $context, $extra_data);

        // A component's own "provides" applies to its children, never to itself.
        $child_context = array_replace($context, $this->metas[$tag_name]['provides'] ?? []);
        $markup        = $this->render_nested($component->render_markup($data), $child_context, $shadow, $depth + 1);

        return $component->wrap($markup, $attr_str, $light_dom, $shadow);
    }

    /**
     * Finds registered components in $html and renders each one in place.
     * Their children (light DOM written in the parent's template) are
     * processed too, with the same context.
     *
     * @param string $html
     * @param array  $context
     * @param bool   $shadow
     * @param int    $depth
     * @return string
     */
    private function render_nested(string $html, array $context, bool $shadow, int $depth): string
    {
        if (!$this->contains_registered_tag($html)) {
            return $html;
        }

        $out = '';
        $pos = 0;

        while ($tag = Markup::next_tag($html, $pos)) {
            $out .= substr($html, $pos, $tag['start'] - $pos);
            $pos  = $tag['end'];

            $is_component = !$tag['comment'] && !$tag['closing'] && isset($this->components[$tag['name']]);
            if (!$is_component) {
                $out .= substr($html, $tag['start'], $tag['end'] - $tag['start']);
                $skip = Markup::skip_content($html, $tag);
                if ($skip !== null) {
                    $out .= substr($html, $pos, $skip - $pos);
                    $pos  = $skip;
                }
                continue;
            }

            $close    = Markup::find_close($html, $tag['name'], $tag['end']);
            $children = $close ? substr($html, $tag['end'], $close['start'] - $tag['end']) : '';
            $end      = $close['end'] ?? $tag['end'];

            // Already rendered (e.g. passed in pre-rendered) — leave it alone.
            if (str_starts_with(ltrim($children), '<template shadowrootmode')) {
                $out .= substr($html, $tag['start'], $end - $tag['start']);
                $pos  = $end;
                continue;
            }

            if ($depth > self::MAX_DEPTH) {
                trigger_error("SWC ComponentRegistry: nesting deeper than " . self::MAX_DEPTH . " levels at '{$tag['name']}'. Is a component rendering itself?", E_USER_WARNING);
                $out .= substr($html, $tag['start'], $end - $tag['start']);
                $pos  = $end;
                continue;
            }

            $child_context = array_replace($context, $this->metas[$tag['name']]['provides'] ?? []);

            $out .= $this->render_element(
                $tag['name'],
                $tag['attrs'],
                Markup::parse_attributes($tag['attrs']),
                $this->render_nested($children, $child_context, $shadow, $depth + 1),
                [],
                $context,
                $shadow,
                $depth,
            );
            $pos = $end;
        }

        return $out . substr($html, $pos);
    }

    /**
     * Cheap pre-check so markup without nested components is never scanned.
     *
     * @param string $html
     * @return bool
     */
    private function contains_registered_tag(string $html): bool
    {
        if (!str_contains($html, '-')) {
            return false; // Custom element names always contain a hyphen.
        }
        foreach ($this->components as $name => $_) {
            if (stripos($html, '<' . $name) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Builds the data array for a component, mirroring how StatefulElement
     * resolves its stores on the JS side:
     *   1. context aliases from "uses"
     *   2. manifest "stores" — authoritative, win any collision
     *   3. plain context values, which never shadow a store
     * then caller data, then the computed callback on top.
     *
     * @param string $tag_name
     * @param array  $host_attrs
     * @param array  $context
     * @param array  $extra_data
     * @return array
     */
    private function build_data(string $tag_name, array $host_attrs, array $context, array $extra_data): array
    {
        $meta   = $this->metas[$tag_name];
        $data   = [];
        $values = [];

        foreach ($meta['uses'] ?? [] as $alias) {
            if (!array_key_exists($alias, $context)) {
                if (array_key_exists($alias, $extra_data)) {
                    continue; // The caller supplies it directly.
                }
                trigger_error("SWC ComponentRegistry: component '{$tag_name}' uses context '{$alias}' but no ancestor provides it", E_USER_WARNING);
                continue;
            }

            $declared = $context[$alias];
            if (is_string($declared) && $this->stores?->has_store($declared)) {
                $data[$alias] = $this->stores->get_state($declared);
            } else {
                $values[$alias] = $declared;
            }
        }

        if ($this->stores !== null) {
            foreach ($meta['stores'] ?? [] as $key) {
                if (!$this->stores->has_store($key)) {
                    trigger_error(
                        "SWC ComponentRegistry: component '{$tag_name}' requires store '{$key}' but it is not registered",
                        E_USER_WARNING
                    );
                }
                $data[$key] = $this->stores->get_state($key);
            }
        }

        foreach ($values as $alias => $value) {
            if (!array_key_exists($alias, $data)) {
                $data[$alias] = $value;
            }
        }

        $data = array_replace($data, $extra_data);

        if (isset($this->computed[$tag_name])) {
            $data = array_replace($data, ($this->computed[$tag_name])($data, $host_attrs));
        }

        return $data;
    }
}
