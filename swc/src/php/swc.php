<?php

declare(strict_types=1);

/**
 * SWC PHP package — single-file include.
 *
 * Include this file instead of requiring each class individually:
 *
 *   require_once __DIR__ . '/path/to/swc/src/php/swc.php';
 *
 * Classes loaded (in dependency order):
 *   SWC\Sanitizer, SWC\NanoRenderer, SWC\StateInjector,
 *   SWC\Component, SWC\StoreRegistry, SWC\ComponentRegistry
 */

$_swc_src = __DIR__ . '/src';

require_once $_swc_src . '/Sanitizer.php';
require_once $_swc_src . '/NanoRenderer.php';
require_once $_swc_src . '/StateInjector.php';
require_once $_swc_src . '/Component.php';
require_once $_swc_src . '/StoreRegistry.php';
require_once $_swc_src . '/ComponentRegistry.php';

unset($_swc_src);
