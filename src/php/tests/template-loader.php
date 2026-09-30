<?php

declare(strict_types=1);

use SWC\TemplateLoader;

Test::section('TemplateLoader — partials');

$partials = __DIR__ . '/fixtures/partials';

Test::same('nested relative partials', 'A-B-C-D', TemplateLoader::load("{$partials}/main.html"));

[$result, $warnings] = Test::warnings(fn() => TemplateLoader::load("{$partials}/loop-a.html"));
Test::ok('circular include warns and stops', $result === 'a:b:' && count($warnings) === 1 && str_contains($warnings[0], 'circular'), var_export([$result, $warnings], true));

[$result, $warnings] = Test::warnings(fn() => TemplateLoader::load("{$partials}/missing.html"));
Test::ok('missing partial warns', $result === 'x' && count($warnings) === 1 && str_contains($warnings[0], 'not found'), var_export([$result, $warnings], true));

[$result, $warnings] = Test::warnings(fn() => TemplateLoader::load("{$partials}/absolute.html"));
Test::ok('web-root partial warns', $result === 'x' && count($warnings) === 1 && str_contains($warnings[0], 'web-root'), var_export([$result, $warnings], true));

try {
    TemplateLoader::load("{$partials}/does-not-exist.html");
    Test::ok('missing template throws', false);
} catch (RuntimeException) {
    Test::ok('missing template throws', true);
}
