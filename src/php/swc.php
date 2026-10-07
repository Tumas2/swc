<?php

declare(strict_types=1);

/**
 * SWC PHP package — single-file include.
 *
 * Include this file instead of requiring each class individually:
 *
 *   require_once __DIR__ . '/path/to/swc/src/php/swc.php';
 *
 * It registers an autoloader for the SWC\ namespace, so each class is loaded
 * only when it is first used (rendering a template alone loads NanoRenderer,
 * TemplateLoader and Sanitizer). With Composer, use its PSR-4 autoloading
 * instead; this file is not needed.
 */

spl_autoload_register(static function (string $class): void {
    if (!str_starts_with($class, 'SWC\\')) {
        return;
    }

    $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
    if (is_file($file)) {
        require $file;
    }
});
