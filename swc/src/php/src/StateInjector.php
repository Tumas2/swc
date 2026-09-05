<?php

declare(strict_types=1);

namespace SWC;

/**
 * Collects store state and emits a single <script> tag that sets
 * window.__SWC_INITIAL_STATE__ so the JS createStore() helper can pick it up.
 *
 * Works in any PHP context (plain PHP, Laravel, WordPress, etc.) — it is just
 * a class that returns a string. Always emits the tag, even when no state has
 * been set (outputs an empty object), so the JS side never needs to guard
 * against an undefined variable.
 *
 * Usage:
 *   $injector = new StateInjector();
 *   $injector->set('workStore', $work_data);
 *   $injector->set('skillsStore', $skills_data);
 *   echo $injector->to_script_tag();
 *   // <script>window.__SWC_INITIAL_STATE__ = {"workStore":{...},"skillsStore":{...}};</script>
 */
class StateInjector
{
    /** @var array<string, array> */
    private array $state = [];

    /**
     * Sets (or replaces) the state for a store key.
     *
     * @param string $key  Store name as used in getStores() and store.json.
     * @param array  $data The store state.
     */
    public function set(string $key, array $data): void
    {
        $this->state[$key] = $data;
    }

    /**
     * Merges additional data into an existing store's state.
     * If the key does not exist yet it is created.
     *
     * @param string $key
     * @param array  $data Partial state to merge on top.
     */
    public function merge(string $key, array $data): void
    {
        $this->state[$key] = array_merge($this->state[$key] ?? [], $data);
    }

    /**
     * Emits the <script> tag that initialises window.__SWC_INITIAL_STATE__.
     * Always outputs at least an empty object so JS never throws on access.
     *
     * @return string
     */
    public function to_script_tag(): string
    {
        $json = json_encode(
            $this->state,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
        );

        return sprintf('<script>window.__SWC_INITIAL_STATE__ = %s;</script>', $json);
    }
}
