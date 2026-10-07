<?php

declare(strict_types=1);

namespace SWC;

/**
 * Strips dangerous tags and attributes from an HTML string.
 * PHP counterpart of _sanitize() in NanoRenderer.js.
 *
 * Parses with PHP's HTML5 parser (Dom\HTMLDocument), so the markup is read
 * and serialized the same way a browser's DOMParser would.
 *
 * This is a blocklist, and stricter than the JS version: it also removes
 * <base>, <frame> and SVG animation elements, and checks every URL-bearing
 * attribute (not only href/src) for javascript: and vbscript: URLs.
 */
class Sanitizer
{
    /** Elements that are always removed entirely. */
    private const DANGEROUS_TAGS = [
        'script', 'iframe', 'object', 'embed', 'style', 'link', 'meta',
        'base', 'frame', 'frameset',
        // SVG animation can set href to a javascript: URL after sanitizing.
        // SVG names are case-sensitive in selectors, hence the camelCase.
        'animate', 'set', 'animateMotion', 'animateTransform',
    ];

    /** Schemes safe_url() lets through. */
    private const SAFE_URL_SCHEMES = ['http', 'https', 'mailto', 'tel'];

    /** Attributes whose value is navigated to or loaded as a URL. */
    private const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'background', 'cite'];

    /**
     * Sanitizes an HTML string by removing dangerous elements and attributes:
     *   - removes the elements in DANGEROUS_TAGS
     *   - removes on* event attributes from all elements
     *   - removes URL attributes that use the javascript: or vbscript: scheme
     *
     * @param string $html Raw HTML input.
     * @return string Sanitized HTML.
     */
    public static function clean(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $doc  = \Dom\HTMLDocument::createFromString('<!DOCTYPE html><body>' . $html, LIBXML_NOERROR, 'UTF-8');
        $body = $doc->body;
        if ($body === null) {
            return '';
        }

        foreach ($body->querySelectorAll(implode(',', self::DANGEROUS_TAGS)) as $node) {
            $node->remove();
        }

        foreach ($body->querySelectorAll('*') as $el) {
            $to_remove = [];
            foreach ($el->attributes as $attr) {
                $name = strtolower($attr->name);
                if (str_starts_with($name, 'on')
                    || (in_array($name, self::URL_ATTRIBUTES, true) && self::is_script_url($attr->value))
                ) {
                    $to_remove[] = $attr->name;
                }
            }
            foreach ($to_remove as $name) {
                $el->removeAttribute($name);
            }
        }

        return $body->innerHTML;
    }

    /**
     * Returns the URL unchanged when it is safe to put in href/src, otherwise "#".
     * Safe means no scheme (relative paths, //host, #frag, ?query) or one of
     * SAFE_URL_SCHEMES. Whitespace and control characters are ignored when
     * reading the scheme, because browsers drop them ("java\tscript:" runs
     * as javascript:). This is the built-in {{url}} helper, and the same
     * rules as safeUrl() in NanoRenderer.js.
     *
     * @param string $url
     * @return string
     */
    public static function safe_url(string $url): string
    {
        $normalized = strtolower(preg_replace('/[\x00-\x20]+/', '', $url) ?? '');
        if (!preg_match('/^([a-z][a-z0-9+.\-]*):/', $normalized, $m)) {
            return $url;
        }
        return in_array($m[1], self::SAFE_URL_SCHEMES, true) ? $url : '#';
    }

    /**
     * Checks whether a URL would run script when followed. Browsers ignore
     * whitespace and control characters inside the scheme ("java\tscript:"),
     * so those are stripped before comparing.
     *
     * @param string $url Attribute value (entities already decoded by the parser).
     * @return bool
     */
    private static function is_script_url(string $url): bool
    {
        $normalized = strtolower(preg_replace('/[\x00-\x20]+/', '', $url) ?? '');
        return str_starts_with($normalized, 'javascript:') || str_starts_with($normalized, 'vbscript:');
    }
}
