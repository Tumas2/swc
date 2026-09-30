<?php

declare(strict_types=1);

namespace SWC;

/**
 * Renders a single SWC component as Declarative Shadow DOM (DSD), or as plain
 * light DOM for static output.
 *
 * Usage:
 *   $c = new Component(
 *       fs_path:  '/var/www/swc/test/portfolio/components/work-history',
 *       web_path: '/swc/test/portfolio/components/work-history',
 *   );
 *   echo $c->render(['workStore' => $data]);
 *
 * Output:
 *   <work-history><template shadowrootmode="open"><!-- rendered markup.html --><link rel="stylesheet" href="/swc/.../work-history/style.css"></template></work-history>
 *
 * The output has no added whitespace and the stylesheet link comes last:
 * the JS side morphs the shadow root against markup.html by position, so
 * anything placed before the markup would shift every node and force them
 * all to be replaced on hydration.
 *
 * The tag name defaults to the basename of $fs_path but can be overridden.
 * CSS is linked (not inlined) so the browser can cache it and it can be
 * preloaded in <head> via preload_tag().
 */
class Component
{
    private string $tag_name;
    private string $fs_path;
    private string $web_path;
    private string $version;

    /**
     * @param string $fs_path  Filesystem path to the component directory (contains markup.html).
     * @param string $web_path Web-accessible URL path for the component (used in <link href>).
     * @param string $tag_name Custom element tag name. Defaults to basename($fs_path).
     * @param string $version  Optional version string appended as ?ver= to CSS and JS URLs.
     */
    public function __construct(
        string $fs_path,
        string $web_path,
        string $tag_name = '',
        string $version  = '',
    ) {
        $this->fs_path  = rtrim($fs_path, '/');
        $this->web_path = rtrim($web_path, '/');
        $this->tag_name = $tag_name ?: basename($fs_path);
        $this->version  = $version;
    }

    /**
     * Renders the component as a custom element string.
     *
     * @param array|object $data       Template data (store state + any computed values).
     * @param array        $host_attrs Extra attributes to add to the host element (e.g. ['slot' => 'history']).
     *                                 true renders a bare attribute; false and null omit it.
     * @param string       $light_dom  HTML to inject as light DOM children inside the host element
     *                                 (used for slotted content in parent components).
     * @param bool         $shadow     true (default) renders Declarative Shadow DOM. false renders
     *                                 plain light DOM with <slot>s filled in and no stylesheet —
     *                                 for static output where the component's JS is not loaded.
     * @return string
     */
    public function render(array|object $data = [], array $host_attrs = [], string $light_dom = '', bool $shadow = true): string
    {
        return $this->wrap($this->render_markup($data), self::attributes_to_string($host_attrs), $light_dom, $shadow);
    }

    /**
     * Renders markup.html against $data, without the host element.
     * on* attributes are converted to data-swc-event-* like the JS side does.
     *
     * @param array|object $data
     * @return string
     */
    public function render_markup(array|object $data = []): string
    {
        $html = (new NanoRenderer())->render($this->load_template(), $data);
        return Markup::convert_event_attributes($html);
    }

    /**
     * Wraps rendered markup in the host element.
     *
     * @param string $markup    Rendered markup (from render_markup()).
     * @param string $attr_str  Host attribute string including leading spaces, e.g. ' slot="a"'.
     * @param string $light_dom HTML for the host's light DOM children.
     * @param bool   $shadow    Declarative Shadow DOM (true) or flattened light DOM (false).
     * @return string
     */
    public function wrap(string $markup, string $attr_str = '', string $light_dom = '', bool $shadow = true): string
    {
        $tag = $this->tag_name;

        if (!$shadow) {
            return "<{$tag}{$attr_str}>" . Markup::fill_slots($markup, $light_dom) . "</{$tag}>";
        }

        $css_link = sprintf(
            '<link rel="stylesheet" href="%s">',
            htmlspecialchars($this->web_path . '/style.css' . $this->ver_suffix(), ENT_QUOTES, 'UTF-8')
        );

        return "<{$tag}{$attr_str}><template shadowrootmode=\"open\">{$markup}{$css_link}</template>{$light_dom}</{$tag}>";
    }

    /**
     * Returns a <link rel="preload"> hint for this component's stylesheet.
     * Place in <head> before the DSD markup to ensure CSS is fetched early.
     *
     * @return string
     */
    public function preload_tag(): string
    {
        return sprintf(
            '<link rel="preload" href="%s" as="style">',
            htmlspecialchars($this->web_path . '/style.css' . $this->ver_suffix(), ENT_QUOTES, 'UTF-8')
        );
    }

    /**
     * Returns a <script type="module"> tag for this component's JavaScript file.
     * Place in <head> to register the custom element before the page body is parsed.
     *
     * @return string
     */
    public function script_tag(): string
    {
        return sprintf(
            '<script type="module" src="%s"></script>',
            htmlspecialchars($this->web_path . '/component.js' . $this->ver_suffix(), ENT_QUOTES, 'UTF-8')
        );
    }

    /**
     * Returns the tag name of this component.
     *
     * @return string
     */
    public function get_tag_name(): string
    {
        return $this->tag_name;
    }

    /**
     * Builds an escaped attribute string from name => value pairs.
     * true renders a bare attribute; false and null omit it.
     *
     * @param array $attrs
     * @return string Attribute string with leading spaces, or ''.
     */
    public static function attributes_to_string(array $attrs): string
    {
        $out = '';
        foreach ($attrs as $name => $value) {
            if ($value === false || $value === null) {
                continue;
            }
            $out .= ' ' . htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8');
            if ($value !== true) {
                $out .= '="' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '"';
            }
        }
        return $out;
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /**
     * Returns a ?ver= query string suffix when a version is set, otherwise empty string.
     *
     * @return string
     */
    private function ver_suffix(): string
    {
        return $this->version !== '' ? '?ver=' . urlencode($this->version) : '';
    }

    /**
     * Loads markup.html with its partials resolved, cached for the process lifetime.
     *
     * @return string
     * @throws \RuntimeException If the template file cannot be read.
     */
    private function load_template(): string
    {
        return TemplateLoader::load($this->fs_path . '/markup.html');
    }
}
