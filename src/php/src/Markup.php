<?php

declare(strict_types=1);

namespace SWC;

/**
 * Small, forgiving HTML scanner used by the rendering pipeline.
 *
 * It does not build a DOM. It walks tags in a string so that markup can be
 * rewritten while every byte it does not touch is kept exactly as written —
 * which matters, because the browser morphs the server output against the
 * JS render and any drift causes nodes to be replaced on hydration.
 *
 * Comments, raw-text elements (script, style, textarea, title) and the
 * contents of plain <template> elements are skipped, mirroring what a
 * TreeWalker over a parsed template would see.
 */
final class Markup
{
    /**
     * Matches a comment, or an opening/closing tag with its attribute string.
     * Possessive quantifiers keep malformed markup from backtracking badly.
     */
    private const TAG_RE = '~<!--.*?-->|<(?<close>/?)(?<name>[a-zA-Z][a-zA-Z0-9:-]*+)(?<attrs>(?:\s++[^\s"\'>/=]++(?:\s*+=\s*+(?:"[^"]*+"|\'[^\']*+\'|[^\s"\'=<>`]++))?)*+)\s*+/?>~s';

    /** Matches one attribute inside an attribute string. */
    private const ATTR_RE = '~(?<space>\s++)(?<name>[^\s"\'>/=]++)(?<rest>\s*+=\s*+(?<value>"[^"]*+"|\'[^\']*+\'|[^\s"\'=<>`]++))?~';

    /** Elements whose content is text, not markup. */
    private const RAW_TEXT = ['script', 'style', 'textarea', 'title'];

    /** Elements that never have a closing tag. */
    private const VOID = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];

    /**
     * Finds the next tag or comment at or after $offset.
     *
     * @param string $html
     * @param int    $offset
     * @return array{start: int, end: int, comment: bool, closing: bool, name: string, attrs: string}|null
     */
    public static function next_tag(string $html, int $offset): ?array
    {
        if (!preg_match(self::TAG_RE, $html, $m, PREG_OFFSET_CAPTURE, $offset)) {
            return null;
        }

        $start = $m[0][1];
        $name  = $m['name'][1] ?? -1;

        return [
            'start'   => $start,
            'end'     => $start + strlen($m[0][0]),
            'comment' => $name === -1,
            'closing' => ($m['close'][0] ?? '') === '/',
            'name'    => strtolower($m['name'][0] ?? ''),
            'attrs'   => $m['attrs'][0] ?? '',
        ];
    }

    /**
     * Returns the offset just past the content of an opening tag that must be
     * skipped as a whole (raw-text elements and plain templates), or null when
     * the tag's content should be scanned normally.
     *
     * @param string $html
     * @param array  $tag A tag returned by next_tag().
     * @return int|null
     */
    public static function skip_content(string $html, array $tag): ?int
    {
        if ($tag['comment'] || $tag['closing']) {
            return null;
        }

        if (in_array($tag['name'], self::RAW_TEXT, true)) {
            $close = stripos($html, '</' . $tag['name'], $tag['end']);
            if ($close === false) {
                return strlen($html);
            }
            $gt = strpos($html, '>', $close);
            return $gt === false ? strlen($html) : $gt + 1;
        }

        if ($tag['name'] === 'template') {
            return self::find_close($html, 'template', $tag['end'])['end'] ?? strlen($html);
        }

        return null;
    }

    /**
     * Finds the closing tag that matches an element opened just before $offset,
     * counting nested elements of the same name.
     *
     * @param string $html
     * @param string $name   Lowercase tag name.
     * @param int    $offset Offset just past the opening tag.
     * @return array{start: int, end: int}|null Null if the element is never closed.
     */
    public static function find_close(string $html, string $name, int $offset): ?array
    {
        $depth = 0;
        $pos   = $offset;

        while ($tag = self::next_tag($html, $pos)) {
            $pos = $tag['end'];

            if ($tag['comment']) {
                continue;
            }

            if ($tag['name'] === $name) {
                if (!$tag['closing']) {
                    $depth++;
                } elseif ($depth === 0) {
                    return ['start' => $tag['start'], 'end' => $tag['end']];
                } else {
                    $depth--;
                }
                continue;
            }

            $pos = self::skip_content($html, $tag) ?? $pos;
        }

        return null;
    }

    /**
     * Parses an attribute string into name => decoded value pairs.
     * Names are lowercased, like the browser does. Valueless attributes map to ''.
     *
     * @param string $attrs
     * @return array<string, string>
     */
    public static function parse_attributes(string $attrs): array
    {
        preg_match_all(self::ATTR_RE, $attrs, $matches, PREG_SET_ORDER);

        $result = [];
        foreach ($matches as $m) {
            $name = strtolower($m['name']);
            if (array_key_exists($name, $result)) {
                continue; // The browser keeps the first occurrence.
            }
            $value = $m['value'] ?? '';
            if ($value !== '' && ($value[0] === '"' || $value[0] === "'")) {
                $value = substr($value, 1, -1);
            }
            $result[$name] = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        return $result;
    }

    /**
     * Renames on* attributes to data-swc-event-*, exactly like
     * StatefulElement.html() does before morphing on the JS side.
     *
     * Without this, SSR output carries inline handlers such as
     * onclick="$toggle" that throw if clicked before JS loads, and the first
     * client render has to rewrite every one of them.
     *
     * @param string $html
     * @return string
     */
    public static function convert_event_attributes(string $html): string
    {
        if (!preg_match('/\son/i', $html)) {
            return $html;
        }

        $out = '';
        $pos = 0;

        while ($tag = self::next_tag($html, $pos)) {
            $out .= substr($html, $pos, $tag['start'] - $pos);
            $raw  = substr($html, $tag['start'], $tag['end'] - $tag['start']);
            $pos  = $tag['end'];

            if (!$tag['comment'] && !$tag['closing'] && $tag['attrs'] !== '') {
                $attrs = preg_replace_callback(
                    self::ATTR_RE,
                    static fn(array $m): string => str_starts_with(strtolower($m['name']), 'on')
                        ? $m['space'] . 'data-swc-event-' . strtolower(substr($m['name'], 2)) . ($m['rest'] ?? '')
                        : $m[0],
                    $tag['attrs']
                );
                $name_end = $tag['start'] + 1 + strlen($tag['name']);
                $raw      = substr($html, $tag['start'], $name_end - $tag['start'])
                          . $attrs
                          . substr($html, $name_end + strlen($tag['attrs']), $tag['end'] - $name_end - strlen($tag['attrs']));
            }
            $out .= $raw;

            $skip = self::skip_content($html, $tag);
            if ($skip !== null) {
                $out .= substr($html, $pos, $skip - $pos);
                $pos  = $skip;
            }
        }

        return $out . substr($html, $pos);
    }

    /**
     * Flattens <slot> elements for light-DOM rendering: each slot is replaced
     * by the light-DOM children assigned to it, or by its fallback content
     * when nothing is assigned. Children with slot="x" go to <slot name="x">;
     * everything else goes to the default (unnamed) slot.
     *
     * @param string $markup    Rendered component markup containing <slot> elements.
     * @param string $light_dom The host element's children.
     * @return string
     */
    public static function fill_slots(string $markup, string $light_dom): string
    {
        if (stripos($markup, '<slot') === false) {
            return $markup;
        }

        $assigned = self::group_by_slot($light_dom);
        $out      = '';
        $pos      = 0;

        while ($tag = self::next_tag($markup, $pos)) {
            $out .= substr($markup, $pos, $tag['start'] - $pos);
            $pos  = $tag['end'];

            if ($tag['name'] !== 'slot' || $tag['closing']) {
                $out .= substr($markup, $tag['start'], $tag['end'] - $tag['start']);
                $skip = self::skip_content($markup, $tag);
                if ($skip !== null) {
                    $out .= substr($markup, $pos, $skip - $pos);
                    $pos  = $skip;
                }
                continue;
            }

            $close    = self::find_close($markup, 'slot', $tag['end']);
            $fallback = $close ? substr($markup, $tag['end'], $close['start'] - $tag['end']) : '';
            $pos      = $close['end'] ?? $pos;

            $slot_name = self::parse_attributes($tag['attrs'])['name'] ?? '';
            $content   = $assigned[$slot_name] ?? '';
            unset($assigned[$slot_name]); // Nodes are assigned to the first matching slot only.

            $out .= trim($content) !== '' ? $content : $fallback;
        }

        return $out . substr($markup, $pos);
    }

    /**
     * Splits an HTML string into its top-level nodes and groups them by the
     * slot they would be assigned to. Comments are dropped (not slottable).
     *
     * @param string $html
     * @return array<string, string> Slot name ('' for default) => HTML.
     */
    private static function group_by_slot(string $html): array
    {
        $groups = [];
        $pos    = 0;

        while ($tag = self::next_tag($html, $pos)) {
            $groups[''] = ($groups[''] ?? '') . substr($html, $pos, $tag['start'] - $pos);
            $pos        = $tag['end'];

            if ($tag['comment']) {
                continue;
            }

            $end = $tag['end'];
            if (!$tag['closing'] && !in_array($tag['name'], self::VOID, true)) {
                $end = self::skip_content($html, $tag)
                    ?? self::find_close($html, $tag['name'], $tag['end'])['end']
                    ?? strlen($html);
            }

            $slot          = $tag['closing'] ? '' : (self::parse_attributes($tag['attrs'])['slot'] ?? '');
            $groups[$slot] = ($groups[$slot] ?? '') . substr($html, $tag['start'], $end - $tag['start']);
            $pos           = $end;
        }

        $groups[''] = ($groups[''] ?? '') . substr($html, $pos);
        return $groups;
    }
}
