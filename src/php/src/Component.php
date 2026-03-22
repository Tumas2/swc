<?php

declare(strict_types=1);

namespace SWC;

/**
 * Renders a single SWC component as Declarative Shadow DOM (DSD).
 *
 * Usage:
 *   $c = new Component(
 *       fs_path:  '/var/www/swc/test/portfolio/components/work-history',
 *       web_path: '/swc/test/portfolio/components/work-history',
 *   );
 *   echo $c->render(['workStore' => $data]);
 *
 * Output:
 *   <work-history>
 *     <template shadowrootmode="open">
 *       <link rel="stylesheet" href="/swc/.../work-history/style.css">
 *       <!-- rendered markup.html -->
 *     </template>
 *   </work-history>
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

    /** @var array<string, string> Static template cache shared across all instances. */
    private static array $template_cache = [];

    /**
     * @param string $fs_path  Filesystem path to the component directory (contains markup.html).
     * @param string $web_path Web-accessible URL path for the component (used in <link href>).
     * @param string $tag_name Custom element tag name. Defaults to basename($fs_path).
     */
    public function __construct(
        string $fs_path,
        string $web_path,
        string $tag_name = '',
    ) {
        $this->fs_path  = rtrim($fs_path, '/');
        $this->web_path = rtrim($web_path, '/');
        $this->tag_name = $tag_name ?: basename($fs_path);
    }

    /**
     * Renders the component as a DSD custom element string.
     *
     * @param array  $data       Template data (store state + any computed values).
     * @param array  $host_attrs Extra attributes to add to the host element (e.g. ['slot' => 'history']).
     * @param string $light_dom  HTML to inject as light DOM children inside the host element
     *                           (used for slotted content in parent components).
     * @return string
     */
    public function render(array $data = [], array $host_attrs = [], string $light_dom = ''): string
    {
        $template = $this->load_template();
        $renderer = new NanoRenderer();
        $inner    = $renderer->render($template, $data);

        $css_link = sprintf(
            '<link rel="stylesheet" href="%s">',
            htmlspecialchars($this->web_path . '/style.css', ENT_QUOTES, 'UTF-8')
        );

        $attr_str = '';
        foreach ($host_attrs as $name => $value) {
            $attr_str .= sprintf(
                ' %s="%s"',
                htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($value, ENT_QUOTES, 'UTF-8')
            );
        }

        $light_section = $light_dom !== '' ? "\n" . $light_dom : '';

        return sprintf(
            "<%s%s>\n  <template shadowrootmode=\"open\">\n    %s\n    %s\n  </template>%s\n</%s>",
            $this->tag_name,
            $attr_str,
            $css_link,
            $inner,
            $light_section,
            $this->tag_name
        );
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
            htmlspecialchars($this->web_path . '/style.css', ENT_QUOTES, 'UTF-8')
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

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    /**
     * Loads markup.html from disk, caching the result for the lifetime of the process.
     *
     * @return string
     * @throws \RuntimeException If the template file cannot be read.
     */
    private function load_template(): string
    {
        $path = $this->fs_path . '/markup.html';
        if (!isset(self::$template_cache[$path])) {
            $content = file_get_contents($path);
            if ($content === false) {
                throw new \RuntimeException("SWC Component: cannot read template at '{$path}'");
            }
            self::$template_cache[$path] = $content;
        }
        return self::$template_cache[$path];
    }
}
