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
 * Supported syntax (mirrors NanoRenderer.js exactly):
 *   {{var}}                       escaped output (htmlspecialchars)
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
    /** @var array<string, array> Parsed AST cache keyed by template string. */
    private array $cache = [];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Renders a template string against a data array.
     *
     * @param string $template The template string.
     * @param array  $data     The context data.
     * @return string Rendered HTML.
     */
    public function render(string $template, array $data): string
    {
        if (!isset($this->cache[$template])) {
            $tokens = $this->tokenize($template);
            $pos    = 0;
            $result = $this->parse_block($tokens, $pos);
            $this->cache[$template] = $result['nodes'];
        }

        return $this->execute($this->cache[$template], [$data]);
    }

    // -------------------------------------------------------------------------
    // Tokenizer
    // -------------------------------------------------------------------------

    /**
     * Splits a template into alternating [text, tag, text, tag, ...] tokens.
     * Even indices are plain text; odd indices are template tags.
     *
     * @param string $template
     * @return string[]
     */
    private function tokenize(string $template): array
    {
        // Same regex as NanoRenderer.js — triple braces first so they are not
        // swallowed by the double-brace branch.
        $tokens = preg_split(
            '/((?:{{{[\s\S]*?}}})|(?:{{[\s\S]*?}}))/u',
            $template,
            -1,
            PREG_SPLIT_DELIM_CAPTURE
        );

        return $tokens ?: [];
    }

    // -------------------------------------------------------------------------
    // Parser — builds an AST from the token stream
    // -------------------------------------------------------------------------

    /**
     * Parses a sequence of tokens into an array of AST nodes.
     * Stops when it hits {{else}}, {{/if}}, or {{/each}} and returns that
     * closing token in the 'stopped_by' key.
     *
     * @param string[] $tokens
     * @param int      $pos    Current position (passed by reference).
     * @return array{nodes: array, stopped_by: string|null}
     */
    private function parse_block(array $tokens, int &$pos): array
    {
        $nodes = [];

        while ($pos < count($tokens)) {
            $is_tag = ($pos % 2 === 1);
            $token  = $tokens[$pos];

            if (!$is_tag) {
                // Plain text
                if ($token !== '') {
                    $nodes[] = ['type' => 'text', 'value' => $token];
                }
                $pos++;
                continue;
            }

            // --- Template tag ---
            $is_triple = str_starts_with($token, '{{{');
            $content   = $is_triple ? substr($token, 3, -3) : substr($token, 2, -2);
            $trimmed   = trim($content);

            // Closing / branching tokens bubble up to the parent parse_block call.
            if ($trimmed === 'else' || $trimmed === '/if' || $trimmed === '/each') {
                $pos++; // consume the token
                return ['nodes' => $nodes, 'stopped_by' => $trimmed];
            }

            // Opening tags
            $parts = preg_split('/\s+/', $trimmed, 2);
            $type  = $parts[0];
            $args  = $parts[1] ?? '';
            $pos++; // consume this opening tag

            if ($type === '#if') {
                $result        = $this->parse_block($tokens, $pos);
                $children      = $result['nodes'];
                $else_children = null;

                if ($result['stopped_by'] === 'else') {
                    $result2       = $this->parse_block($tokens, $pos);
                    $else_children = $result2['nodes'];
                    // $result2['stopped_by'] === '/if'
                }

                $nodes[] = [
                    'type'     => 'if',
                    'path'     => explode('.', $args),
                    'children' => $children,
                    'else'     => $else_children,
                ];

            } elseif ($type === '#each') {
                $result        = $this->parse_block($tokens, $pos);
                $children      = $result['nodes'];
                $else_children = null;

                if ($result['stopped_by'] === 'else') {
                    $result2       = $this->parse_block($tokens, $pos);
                    $else_children = $result2['nodes'];
                    // $result2['stopped_by'] === '/each'
                }

                $nodes[] = [
                    'type'     => 'each',
                    'path'     => explode('.', $args),
                    'children' => $children,
                    'else'     => $else_children,
                ];

            } elseif ($is_triple) {
                // {{{ raw }}} or {{{ safe raw }}}
                $raw     = $trimmed;
                $is_safe = false;

                if (str_starts_with($raw, 'safe ')) {
                    $is_safe = true;
                    $raw     = trim(substr($raw, 5));
                }

                [$path, $fallback] = $this->parse_fallback($raw);

                $nodes[] = [
                    'type'     => $is_safe ? 'safe' : 'raw',
                    'path'     => $path,
                    'fallback' => $fallback,
                ];

            } else {
                // {{ escaped }}
                [$path, $fallback] = $this->parse_fallback($trimmed);

                $nodes[] = [
                    'type'     => 'var',
                    'path'     => $path,
                    'fallback' => $fallback,
                ];
            }
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
     * @param array[] $stack Context stack (innermost frame at the end).
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
                    $val = $this->get($stack, $node['path']);
                    $out .= htmlspecialchars(
                        (string) ($val ?? $node['fallback']),
                        ENT_QUOTES | ENT_HTML5,
                        'UTF-8'
                    );
                    break;

                case 'raw':
                    $val = $this->get($stack, $node['path']);
                    $out .= (string) ($val ?? $node['fallback']);
                    break;

                case 'safe':
                    $val = $this->get($stack, $node['path']);
                    $out .= Sanitizer::clean((string) ($val ?? $node['fallback']));
                    break;

                case 'if':
                    $val = $this->get($stack, $node['path']);
                    if ($val) {
                        $out .= $this->execute($node['children'], $stack);
                    } elseif ($node['else'] !== null) {
                        $out .= $this->execute($node['else'], $stack);
                    }
                    break;

                case 'each':
                    $list = $this->get($stack, $node['path']);
                    if (is_array($list) && count($list) > 0) {
                        $index = 0;
                        foreach ($list as $item) {
                            // Mirror JS: spread item properties then add `this` and `index`.
                            $frame          = is_array($item) ? $item : [];
                            $frame['this']  = $item;
                            $frame['index'] = $index++;
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
    // Context-stack lookup — mirrors _get() from NanoRenderer.js:51-77
    // -------------------------------------------------------------------------

    /**
     * Looks up a dot-path value by searching the context stack from top to bottom.
     * Mirrors _get() from NanoRenderer.js.
     *
     * @param array[] $stack
     * @param string[] $parts Dot-path split into parts, e.g. ['this', 'name'].
     * @return mixed
     */
    private function get(array $stack, array $parts): mixed
    {
        if (empty($parts)) {
            return null;
        }

        $first = $parts[0];

        if ($first === 'this') {
            // Find the innermost stack frame that has a 'this' key.
            $this_val = null;
            for ($i = count($stack) - 1; $i >= 0; $i--) {
                if (array_key_exists('this', $stack[$i])) {
                    $this_val = $stack[$i]['this'];
                    break;
                }
            }
            // Fall back to the topmost frame itself if no 'this' key found.
            if ($this_val === null) {
                $this_val = end($stack);
            }

            if (count($parts) === 1) {
                return $this_val;
            }

            // Traverse remaining parts on the this-value.
            $obj = $this_val;
            for ($j = 1; $j < count($parts); $j++) {
                if (!is_array($obj) || !array_key_exists($parts[$j], $obj)) {
                    return null;
                }
                $obj = $obj[$parts[$j]];
            }
            return $obj;
        }

        // Non-this path: find the first stack frame from the top that has $first.
        $ctx = null;
        for ($i = count($stack) - 1; $i >= 0; $i--) {
            if (is_array($stack[$i]) && array_key_exists($first, $stack[$i])) {
                $ctx = $stack[$i];
                break;
            }
        }
        if ($ctx === null) {
            return null;
        }

        // Traverse the full path on the found frame.
        $obj = $ctx;
        foreach ($parts as $key) {
            if (!is_array($obj) || !array_key_exists($key, $obj)) {
                return null;
            }
            $obj = $obj[$key];
        }
        return $obj;
    }
}
