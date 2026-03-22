<?php

declare(strict_types=1);

namespace SWC;

/**
 * Auto-discovers store.json files from a folder and manages their state.
 *
 * Usage:
 *   $stores = new StoreRegistry(__DIR__ . '/stores');
 *   // Auto-discovered: workStore, skillsStore
 *
 *   $stores->merge('workStore', ['companies' => $server_companies]);
 *   echo $stores->to_script_tag();
 *   // <script>window.__SWC_INITIAL_STATE__ = {...};</script>
 *
 * Works standalone (without ComponentRegistry) — just call to_script_tag() and
 * output it in <head> before the component <script type="module"> import.
 */
class StoreRegistry
{
    /** @var array<string, array{meta: array, state: array}> Keyed by store name. */
    private array $stores = [];

    private StateInjector $injector;

    /**
     * @param string $fs_path Filesystem path to the folder containing store.json files.
     */
    public function __construct(string $fs_path)
    {
        $this->injector = new StateInjector();
        $this->discover($fs_path);
    }

    /**
     * Merges additional data into a store's state (server-side overrides).
     * Creates the entry if it does not exist yet.
     *
     * @param string $key  Store name matching the "name" field in store.json.
     * @param array  $data Partial state to merge on top of the store's defaults.
     */
    public function merge(string $key, array $data): void
    {
        if (!isset($this->stores[$key])) {
            $this->stores[$key] = ['meta' => ['name' => $key], 'state' => []];
        }
        $this->stores[$key]['state'] = array_merge($this->stores[$key]['state'], $data);
        $this->injector->set($key, $this->stores[$key]['state']);
    }

    /**
     * Returns the current state for a store key.
     * Returns an empty array if the key is not registered.
     *
     * @param string $key
     * @return array
     */
    public function get_state(string $key): array
    {
        return $this->stores[$key]['state'] ?? [];
    }

    /**
     * Returns true if a store with this key was discovered or added.
     *
     * @param string $key
     * @return bool
     */
    public function has_store(string $key): bool
    {
        return isset($this->stores[$key]);
    }

    /**
     * Returns all store states as an associative array.
     *
     * @return array<string, array>
     */
    public function get_all(): array
    {
        $all = [];
        foreach ($this->stores as $key => $store) {
            $all[$key] = $store['state'];
        }
        return $all;
    }

    /**
     * Emits the <script> tag that sets window.__SWC_INITIAL_STATE__.
     *
     * @return string
     */
    public function to_script_tag(): string
    {
        return $this->injector->to_script_tag();
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /**
     * Scans $fs_path for *.json files and registers any that have a "name" field.
     *
     * @param string $fs_path
     */
    private function discover(string $fs_path): void
    {
        $pattern = rtrim($fs_path, '/') . '/*.json';
        foreach (glob($pattern) ?: [] as $file) {
            $meta = json_decode(file_get_contents($file), true);
            if (!is_array($meta) || !isset($meta['name'])) {
                continue;
            }

            $name  = $meta['name'];
            $state = $meta['state'] ?? [];

            $this->stores[$name] = [
                'meta'  => $meta,
                'state' => $state,
            ];
            $this->injector->set($name, $state);
        }
    }
}
