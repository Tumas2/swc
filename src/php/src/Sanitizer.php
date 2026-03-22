<?php

declare(strict_types=1);

namespace SWC;

/**
 * Strips dangerous tags and event attributes from an HTML string.
 * PHP equivalent of _sanitize() in NanoRenderer.js.
 */
class Sanitizer
{
    /** Tags that are always removed entirely. */
    private const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta'];

    /**
     * Sanitizes an HTML string by removing dangerous elements and attributes.
     * Mirrors _sanitize() from NanoRenderer.js:
     *   - Removes <script>, <iframe>, <object>, <embed>, <style>, <link>, <meta>
     *   - Removes on* event attributes from all elements
     *   - Removes href/src attributes whose value starts with javascript:
     *
     * @param string $html Raw HTML input.
     * @return string Sanitized HTML.
     */
    public static function clean(string $html): string
    {
        if ($html === '') {
            return '';
        }

        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        // Wrap in a known charset so DOMDocument does not mangle UTF-8 characters.
        $doc->loadHTML('<?xml encoding="UTF-8"><body>' . $html . '</body>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();

        $xpath = new \DOMXPath($doc);

        // Remove dangerous tags.
        foreach (self::DANGEROUS_TAGS as $tag) {
            foreach (iterator_to_array($xpath->query('//' . $tag) ?: []) as $node) {
                $node->parentNode?->removeChild($node);
            }
        }

        // Remove on* attributes and javascript: href/src from all remaining elements.
        foreach (iterator_to_array($xpath->query('//*') ?: []) as $el) {
            /** @var \DOMElement $el */
            $to_remove = [];
            foreach ($el->attributes as $attr) {
                if (str_starts_with($attr->name, 'on')) {
                    $to_remove[] = $attr->name;
                } elseif (in_array($attr->name, ['href', 'src'], true)) {
                    if (str_starts_with(strtolower(trim($attr->value)), 'javascript:')) {
                        $to_remove[] = $attr->name;
                    }
                }
            }
            foreach ($to_remove as $name) {
                $el->removeAttribute($name);
            }
        }

        // Extract just the body content (strip the wrapper we added).
        $body = $doc->getElementsByTagName('body')->item(0);
        if ($body === null) {
            return '';
        }

        $result = '';
        foreach ($body->childNodes as $child) {
            $result .= $doc->saveHTML($child);
        }

        return $result;
    }
}
