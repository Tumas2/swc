<?php

declare(strict_types=1);

namespace SWC;

/**
 * Auto-discovers SWC components from a folder by reading each component.json
 * and manages rendering with optional StoreRegistry integration.
 *
 * Usage:
 *   $components = new ComponentRegistry(
 *       fs_base:  __DIR__ . '/components',
 *       web_base: '/swc/test/portfolio/components',
 *       stores:   $store_registry,   // optional
 *   );
 *
 *   echo $components->preload_tags();           // <link rel="preload"> for each style.css
 *   echo $components->render('work-history');  // renders with state from StoreRegistry
 *   echo $components->render('site-nav');      // renders with no state (static)
 *
 * When $stores is provided, ComponentRegistry:
 *   - Automatically passes each component's required stores (from component.json "stores" array)
 *   - Emits a warning if a required store has no state
 *
 * Individual components can still be used directly via new Component() if needed.
 */
class ComponentRegistry
{
    /** @var array<string, Component> Keyed by tag name. */
    private array $components = [];

    /** @var array<string, array> component.json metadata, keyed by tag name. */
    private array $metas = [];

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
        $this->discover(rtrim($fs_base, '/'), rtrim($web_base, '/'));
    }

    /**
     * Renders a component by tag name to a DSD HTML string.
     *
     * @param string $tag_name   The custom element tag name (e.g. 'work-history').
     * @param array  $host_attrs Extra attributes on the host element (e.g. ['slot' => 'history']).
     * @param string $light_dom  HTML injected as light DOM children (for slotted content).
     * @return string
     */
    public function render(string $tag_name, array $host_attrs = [], string $light_dom = ''): string
    {
        if (!isset($this->components[$tag_name])) {
            return "<!-- SWC: component '{$tag_name}' not found -->";
        }

        $data = $this->build_data($tag_name);

        return $this->components[$tag_name]->render($data, $host_attrs, $light_dom);
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
     * Scans $fs_base for sub-folders that contain a component.json file.
     *
     * @param string $fs_base
     * @param string $web_base
     */
    private function discover(string $fs_base, string $web_base): void
    {
        foreach (glob($fs_base . '/*/component.json') ?: [] as $file) {
            $meta = json_decode(file_get_contents($file), true);
            if (!is_array($meta) || !isset($meta['name'])) {
                continue;
            }

            $dir      = dirname($file);
            $name     = $meta['name'];
            $dir_name = basename($dir);

            $this->metas[$name]      = $meta;
            $this->components[$name] = new Component(
                fs_path:  $dir,
                web_path: $web_base . '/' . $dir_name,
                tag_name: $name,
            );
        }
    }

    /**
     * Builds the data array for a component by looking up its required stores.
     * Emits a PHP warning if a required store has no state in the StoreRegistry.
     *
     * @param string $tag_name
     * @return array
     */
    private function build_data(string $tag_name): array
    {
        if ($this->stores === null) {
            return [];
        }

        $data       = [];
        $store_keys = $this->metas[$tag_name]['stores'] ?? [];

        foreach ($store_keys as $key) {
            $data[$key] = $this->stores->get_state($key);

            if (!$this->stores->has_store($key)) {
                trigger_error(
                    "SWC ComponentRegistry: component '{$tag_name}' requires store '{$key}' but it is not registered",
                    E_USER_WARNING
                );
            }
        }

        return $data;
    }
}
