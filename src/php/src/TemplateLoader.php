<?php

declare(strict_types=1);

namespace SWC;

/**
 * Loads template files from disk and resolves {{#html './partial.html'}}
 * includes, mirroring loadHTML() + resolvePartials() in html-loader.js.
 *
 * Partial paths are resolved relative to the file that includes them. Paths
 * starting with "/" are web-root paths on the JS side; PHP cannot map those to
 * the filesystem, so they are reported and replaced with an empty string.
 */
final class TemplateLoader
{
    /** Same pattern as PARTIAL_RE in html-loader.js. */
    private const PARTIAL_RE = '/\{\{#html\s+[\'"]([^\'"]+)[\'"]\s*\}\}/';

    /** @var array<string, string> Resolved templates keyed by real path, kept for the process lifetime. */
    private static array $cache = [];

    /**
     * Returns the template at $path with all partials inlined.
     *
     * @param string $path Filesystem path to the template file.
     * @return string
     * @throws \RuntimeException If the file cannot be read.
     */
    public static function load(string $path): string
    {
        $real = realpath($path);
        if ($real === false) {
            throw new \RuntimeException("SWC TemplateLoader: cannot read template at '{$path}'");
        }

        return self::$cache[$real] ??= self::resolve_partials(self::read($real), dirname($real), [$real => true]);
    }

    /**
     * Inlines every partial include in $template, recursively.
     *
     * @param string              $template The template source.
     * @param string              $dir      Directory of the file $template came from.
     * @param array<string, bool> $visiting Real paths on the current include chain, for cycle detection.
     * @return string
     */
    private static function resolve_partials(string $template, string $dir, array $visiting): string
    {
        return preg_replace_callback(self::PARTIAL_RE, static function (array $m) use ($dir, $visiting): string {
            $relative = $m[1];

            if (str_starts_with($relative, '/')) {
                trigger_error("SWC TemplateLoader: partial '{$relative}' is a web-root path; only relative paths can be resolved on the server", E_USER_WARNING);
                return '';
            }

            $real = realpath($dir . '/' . $relative);
            if ($real === false) {
                trigger_error("SWC TemplateLoader: partial '{$relative}' not found from '{$dir}'", E_USER_WARNING);
                return '';
            }

            if (isset($visiting[$real])) {
                trigger_error("SWC TemplateLoader: circular partial include detected: {$real}", E_USER_WARNING);
                return '';
            }

            return self::resolve_partials(self::read($real), dirname($real), $visiting + [$real => true]);
        }, $template);
    }

    /**
     * Reads a file, throwing on failure.
     *
     * @param string $path
     * @return string
     * @throws \RuntimeException If the file cannot be read.
     */
    private static function read(string $path): string
    {
        $content = @file_get_contents($path);
        if ($content === false) {
            throw new \RuntimeException("SWC TemplateLoader: cannot read template at '{$path}'");
        }
        return $content;
    }
}
