<?php

declare(strict_types=1);

namespace SWC;

/**
 * PHP port of NanoRenderer.js.
 *
 * Tokenizes a template string with the same regex as the JS version, builds an
 * AST, then evaluates it against a data array with an identical context-stack
 * lookup strategy (_get logic).
 *
 * The goal is byte-identical output to the JS renderer for the same template
 * and data, so hydration never has to replace server-rendered nodes. That
 * means following JavaScript semantics, not PHP ones:
 *   - truthiness: "0" and [] are truthy, 0 / "" / null / false / NaN are not
 *   - output: true → "true", [1,2] → "1,2", 0.1 + 0.2 → "0.30000000000000004"
 *   - {{#each}} only loops over lists; associative arrays and objects are
 *     JS objects, so they render the {{else}} branch
 *   - .length works on lists and strings
 *   - escaping uses the same character map, including / → &#x2F;
 *   - a template with unbalanced blocks renders as an empty string
 *
 * Data may be arrays, stdClass objects (e.g. from json_decode() without
 * $associative) or a mix. Objects let an empty {} stay distinct from [].
 *
 * Supported syntax (mirrors NanoRenderer.js exactly):
 *   {{var}}                       escaped output
 *   {{{var}}}                     raw unescaped output
 *   {{{safe var}}}                sanitized via Sanitizer::clean()
 *   {{var || 'default'}}          escaped with fallback
 *   {{#if cond}}...{{/if}}        conditional
 *   {{#if cond}}...{{else}}...{{/if}}  with else branch
 *   {{#each list}}...{{/each}}    loop
 *   {{#each list}}...{{else}}...{{/each}}  loop with empty-list fallback
 *   {{this}}                      current loop item
 *   {{this.prop}}                 property of current item
 *   {{index}}                     current loop index (0-based)
 *   nested {{#each}}              context stack — inner this shadows outer this
 */
class NanoRenderer
{
    /** Same map as _ESCAPE_MAP in NanoRenderer.js. */
    private const ESCAPE_MAP = ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;', "'" => '&#39;', '"' => '&quot;', '/' => '&#x2F;'];

    /**
     * Parsed AST cache keyed by template string, shared by every instance —
     * like the shared singleton in NanoRenderer.js, each template is parsed
     * once per process no matter how many components render it.
     * A null entry marks a template that failed to parse.
     *
     * @var array<string, array|null>
     */
    private static array $cache = [];

    /** Marks a property that does not exist (JavaScript's undefined). */
    private static ?object $undefined = null;

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Renders a template string against a data array or object.
     *
     * @param string       $template The template string.
     * @param array|object $data     The context data.
     * @return string Rendered HTML, or '' if the template is malformed.
     */
    public function render(string $template, array|object $data): string
    {
        if (!array_key_exists($template, self::$cache)) {
            self::$cache[$template] = $this->compile($template);
        }

        $nodes = self::$cache[$template];
        return $nodes === null ? '' : $this->execute($nodes, [$data]);
    }

    // -------------------------------------------------------------------------
    // Tokenizer + parser
    // -------------------------------------------------------------------------

    /**
     * Parses a template into an AST. Returns null (and warns) when the block
     * structure is invalid — the JS renderer fails to compile and renders ''
     * in the same situations.
     *
     * @param string $template
     * @return array|null
     */
    private function compile(string $template): ?array
    {
        // Same regex as NanoRenderer.js — triple braces first so they are not
        // swallowed by the double-brace branch.
        $tokens = preg_split('/((?:{{{[\s\S]*?}}})|(?:{{[\s\S]*?}}))/u', $template, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];
        $pos    = 0;

        try {
            return $this->parse_block($tokens, $pos)['nodes'];
        } catch (\UnexpectedValueException $e) {
            trigger_error('SWC NanoRenderer: ' . $e->getMessage(), E_USER_WARNING);
            return null;
        }
    }

    /**
     * Parses tokens into AST nodes until the block's closing tag.
     *
     * @param string[]    $tokens     Alternating [text, tag, text, tag, ...].
     * @param int         $pos        Current position (passed by reference).
     * @param string|null $closer     Closing tag that ends this block ('/if', '/each'), or null at top level.
     * @param bool        $allow_else Whether {{else}} may end this block.
     * @return array{nodes: array, stopped_by: string|null}
     * @throws \UnexpectedValueException On unbalanced blocks.
     */
    private function parse_block(array $tokens, int &$pos, ?string $closer = null, bool $allow_else = false): array
    {
        $nodes = [];

        while ($pos < count($tokens)) {
            $index = $pos++;
            $token = $tokens[$index];

            if ($index % 2 === 0) {
                // Even indices are plain text, odd indices are template tags.
                if ($token !== '') {
                    $nodes[] = ['type' => 'text', 'value' => $token];
                }
                continue;
            }

            $is_triple = str_starts_with($token, '{{{');
            $trimmed   = trim($is_triple ? substr($token, 3, -3) : substr($token, 2, -2));
            $parts     = preg_split('/\s+/', $trimmed);
            $type      = $parts[0];
            $args      = implode(' ', array_slice($parts, 1));

            if ($type === 'else') {
                if (!$allow_else) {
                    throw new \UnexpectedValueException('unexpected {{else}}');
                }
                return ['nodes' => $nodes, 'stopped_by' => 'else'];
            }

            if ($type === '/if' || $type === '/each') {
                if ($type !== $closer) {
                    throw new \UnexpectedValueException("unexpected {{{$type}}}");
                }
                return ['nodes' => $nodes, 'stopped_by' => $type];
            }

            if ($type === '#if' || $type === '#each') {
                $block_closer  = '/' . substr($type, 1);
                $result        = $this->parse_block($tokens, $pos, $block_closer, true);
                $else_children = null;

                if ($result['stopped_by'] === 'else') {
                    $else_children = $this->parse_block($tokens, $pos, $block_closer)['nodes'];
                }

                $nodes[] = [
                    'type'     => substr($type, 1),
                    'path'     => explode('.', $args),
                    'children' => $result['nodes'],
                    'else'     => $else_children,
                ];
                continue;
            }

            $raw  = $trimmed;
            $kind = 'var';
            if ($is_triple) {
                $kind = 'raw';
                if (str_starts_with($raw, 'safe ')) {
                    $kind = 'safe';
                    $raw  = trim(substr($raw, 5));
                }
            }

            [$path, $fallback] = $this->parse_fallback($raw);
            $nodes[] = ['type' => $kind, 'path' => $path, 'fallback' => $fallback];
        }

        if ($closer !== null) {
            throw new \UnexpectedValueException('unclosed {{#' . substr($closer, 1) . '}}');
        }

        return ['nodes' => $nodes, 'stopped_by' => null];
    }

    /**
     * Parses a possible fallback expression: "expr || 'default'".
     * Returns [path_parts[], fallback_string].
     *
     * @param string $expr
     * @return array{0: string[], 1: string}
     */
    private function parse_fallback(string $expr): array
    {
        if (preg_match('/^(.*?)\s*\|\|\s*(["\'])(.*?)\2$/u', $expr, $m)) {
            return [explode('.', trim($m[1])), $m[3]];
        }
        return [explode('.', $expr), ''];
    }

    // -------------------------------------------------------------------------
    // Executor — walks the AST with a context stack
    // -------------------------------------------------------------------------

    /**
     * Evaluates an AST node array against the current context stack.
     *
     * @param array[] $nodes
     * @param array   $stack Context stack of arrays/objects (innermost frame at the end).
     * @return string
     */
    private function execute(array $nodes, array $stack): string
    {
        $out = '';

        foreach ($nodes as $node) {
            switch ($node['type']) {

                case 'text':
                    $out .= $node['value'];
                    break;

                case 'var':
                    $val  = $this->get($stack, $node['path']) ?? $node['fallback'];
                    $out .= strtr($this->to_js_string($val), self::ESCAPE_MAP);
                    break;

                case 'raw':
                    $out .= $this->to_js_string($this->get($stack, $node['path']) ?? $node['fallback']);
                    break;

                case 'safe':
                    // JS: _sanitize(str) parses `str || ''`, so falsy values render nothing.
                    $val  = $this->get($stack, $node['path']) ?? $node['fallback'];
                    $out .= $this->is_truthy($val) ? Sanitizer::clean($this->to_js_string($val)) : '';
                    break;

                case 'if':
                    if ($this->is_truthy($this->get($stack, $node['path']))) {
                        $out .= $this->execute($node['children'], $stack);
                    } elseif ($node['else'] !== null) {
                        $out .= $this->execute($node['else'], $stack);
                    }
                    break;

                case 'each':
                    $list = $this->get($stack, $node['path']);
                    if (is_array($list) && $list !== [] && array_is_list($list)) {
                        foreach ($list as $index => $item) {
                            // Mirror JS: spread object items, then add `this` and `index`.
                            $frame          = is_array($item) ? $item : (is_object($item) ? get_object_vars($item) : []);
                            $frame['this']  = $item;
                            $frame['index'] = $index;
                            $stack[]        = $frame;
                            $out           .= $this->execute($node['children'], $stack);
                            array_pop($stack);
                        }
                    } elseif ($node['else'] !== null) {
                        $out .= $this->execute($node['else'], $stack);
                    }
                    break;
            }
        }

        return $out;
    }

    // -------------------------------------------------------------------------
    // Context-stack lookup — mirrors _get() from NanoRenderer.js
    // -------------------------------------------------------------------------

    /**
     * Looks up a dot-path value by searching the context stack from top to bottom.
     * Returns null where JS would return undefined.
     *
     * @param array    $stack
     * @param string[] $parts Dot-path split into parts, e.g. ['this', 'name'].
     * @return mixed
     */
    private function get(array $stack, array $parts): mixed
    {
        $undefined = self::undefined();
        $first     = $parts[0];

        if ($first === 'this') {
            // Innermost frame with a `this`; falls back to the topmost frame itself.
            $obj = end($stack);
            for ($i = count($stack) - 1; $i >= 0; $i--) {
                $candidate = $this->prop($stack[$i], 'this');
                if ($candidate !== $undefined) {
                    $obj = $candidate;
                    break;
                }
            }

            for ($j = 1; $j < count($parts); $j++) {
                if ($obj === null) {
                    return null;
                }
                $obj = $this->prop($obj, $parts[$j]);
                if ($obj === $undefined) {
                    return null;
                }
            }
            return $obj;
        }

        // Non-this path: find the innermost frame that has the first key.
        $obj = $undefined;
        for ($i = count($stack) - 1; $i >= 0; $i--) {
            if ($this->prop($stack[$i], $first) !== $undefined) {
                $obj = $stack[$i];
                break;
            }
        }
        if ($obj === $undefined) {
            return null;
        }

        // JS: parts.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, ctx)
        foreach ($parts as $key) {
            if (!$this->is_truthy($obj)) {
                return null;
            }
            $obj = $this->prop($obj, $key);
            if ($obj === $undefined) {
                return null;
            }
        }
        return $obj;
    }

    /**
     * Reads one property the way JavaScript would: object keys, list indexes,
     * and `.length` on lists and strings.
     *
     * @param mixed  $value
     * @param string $key
     * @return mixed The value, or the undefined marker.
     */
    private function prop(mixed $value, string $key): mixed
    {
        if (is_array($value)) {
            if ($key === 'length' && array_is_list($value)) {
                return count($value);
            }
            return array_key_exists($key, $value) ? $value[$key] : self::undefined();
        }

        if (is_object($value)) {
            $vars = get_object_vars($value);
            return array_key_exists($key, $vars) ? $vars[$key] : self::undefined();
        }

        if (is_string($value) && $key === 'length') {
            // JS string length counts UTF-16 code units: one per character,
            // plus one more for characters outside the BMP (emoji etc.).
            $chars  = preg_match_all('/./su', $value);
            $astral = preg_match_all('/[\x{10000}-\x{10FFFF}]/u', $value);
            return $chars === false ? strlen($value) : $chars + $astral;
        }

        return self::undefined();
    }

    /**
     * Returns the shared marker object for JavaScript's undefined.
     *
     * @return object
     */
    private static function undefined(): object
    {
        return self::$undefined ??= new \stdClass();
    }

    // -------------------------------------------------------------------------
    // JavaScript value semantics
    // -------------------------------------------------------------------------

    /**
     * JavaScript truthiness: only false, 0, NaN, '' and null are falsy.
     * Unlike PHP, "0" and empty arrays are truthy.
     *
     * @param mixed $value
     * @return bool
     */
    private function is_truthy(mixed $value): bool
    {
        return match (true) {
            $value === null, $value === false, $value === '' => false,
            is_int($value)   => $value !== 0,
            is_float($value) => $value !== 0.0 && !is_nan($value),
            default          => true,
        };
    }

    /**
     * Converts a value to a string the way JavaScript's String() does.
     *
     * @param mixed $value
     * @return string
     */
    private function to_js_string(mixed $value): string
    {
        return match (true) {
            $value === null  => '',
            is_bool($value)  => $value ? 'true' : 'false',
            is_int($value)   => (string) $value,
            is_float($value) => $this->js_number($value),
            is_string($value) => $value,
            is_array($value) => array_is_list($value)
                ? implode(',', array_map($this->to_js_string(...), $value))
                : '[object Object]',
            $value instanceof \Stringable => (string) $value,
            default          => '[object Object]',
        };
    }

    /**
     * Formats a float like JavaScript's Number.prototype.toString():
     * shortest round-trip digits, integers without ".0", and exponent
     * notation only below 1e-6 or from 1e21 up.
     *
     * @param float $value
     * @return string
     */
    private function js_number(float $value): string
    {
        if (is_nan($value)) {
            return 'NaN';
        }
        if (is_infinite($value)) {
            return $value > 0 ? 'Infinity' : '-Infinity';
        }
        if ($value == 0.0) {
            return '0'; // Also covers -0.
        }

        // var_export() gives the shortest round-trip representation, e.g. "1.0E-7".
        preg_match('/^(\d+)(?:\.(\d+))?(?:E([+-]?\d+))?$/', var_export(abs($value), true), $m);
        $digits = $m[1] . ($m[2] ?? '');
        $point  = strlen($m[1]) + (int) ($m[3] ?? 0); // Decimal point position within $digits.

        $trimmed = ltrim($digits, '0');
        $point  -= strlen($digits) - strlen($trimmed);
        $digits  = rtrim($trimmed, '0');
        $k       = strlen($digits);
        $sign    = $value < 0 ? '-' : '';

        if ($k <= $point && $point <= 21) {
            return $sign . $digits . str_repeat('0', $point - $k);
        }
        if (0 < $point && $point <= 21) {
            return $sign . substr($digits, 0, $point) . '.' . substr($digits, $point);
        }
        if (-6 < $point && $point <= 0) {
            return $sign . '0.' . str_repeat('0', -$point) . $digits;
        }

        $exponent = $point - 1;
        $mantissa = $k === 1 ? $digits : $digits[0] . '.' . substr($digits, 1);
        return $sign . $mantissa . 'e' . ($exponent < 0 ? '-' : '+') . abs($exponent);
    }
}
