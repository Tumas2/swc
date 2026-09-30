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
 *
 * PHP arrays cannot tell an empty object from an empty list, so an empty
 * array nested in state is sent as []. Pass stdClass objects (for example
 * json_decode($json) without $associative) where an empty {} must survive.
 */
class StateInjector
{
    private const JSON_FLAGS = JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT
        | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR;

    /** @var array<string, array|object> */
    private array $state = [];

    /**
     * Sets (or replaces) the state for a store key.
     *
     * @param string       $key  Store name as used in getStores() and store.json.
     * @param array|object $data The store state.
     */
    public function set(string $key, array|object $data): void
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
        $this->state[$key] = array_merge((array) ($this->state[$key] ?? []), $data);
    }

    /**
     * Emits the <script> tag that initialises window.__SWC_INITIAL_STATE__.
     * Always outputs at least an empty object so JS never throws on access.
     *
     * Invalid UTF-8 is replaced with U+FFFD and unencodable values (INF, NAN)
     * become 0, each with a warning, instead of producing broken JavaScript.
     *
     * @return string
     */
    public function to_script_tag(): string
    {
        // Store state is always an object on the JS side; an empty PHP array
        // would otherwise be encoded as [].
        $state = new \stdClass();
        foreach ($this->state as $key => $data) {
            $state->{$key} = $data === [] ? new \stdClass() : $data;
        }

        $json = json_encode($state, self::JSON_FLAGS);

        if (json_last_error() !== JSON_ERROR_NONE) {
            trigger_error('SWC StateInjector: ' . json_last_error_msg(), E_USER_WARNING);
        }
        if ($json === false) {
            $json = '{}';
        }

        return sprintf('<script>window.__SWC_INITIAL_STATE__ = %s;</script>', $json);
    }
}
