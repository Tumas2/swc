<?php

declare(strict_types=1);

/**
 * Portfolio SSR demo — PHP-rendered version of swc/test/portfolio/index.html
 *
 * Demonstrates:
 *  - StoreRegistry auto-discovers stores/ folder, loads default state from store.json
 *  - Server-side data merged on top via merge()
 *  - ComponentRegistry auto-discovers components/ folder via manifest.json
 *  - preload_tags() in <head> for CSS
 *  - StoreRegistry::to_script_tag() sets window.__SWC_INITIAL_STATE__
 *  - Components rendered as Declarative Shadow DOM — content visible before JS loads
 *  - set_computed() mirrors skills-grid's JS computed() on the server
 *  - about-section gets work-history and skills-grid as slotted light DOM children
 *  - JS loads, createStore() picks up SSR state, morph() is a no-op (zero flicker)
 */

require_once __DIR__ . '/../../src/php/swc.php';

use SWC\StoreRegistry;
use SWC\ComponentRegistry;

// ---------------------------------------------------------------------------
// Store setup — load defaults from store.json files, merge server-side data
// ---------------------------------------------------------------------------
$stores = new StoreRegistry(__DIR__ . '/../portfolio/stores');

// Example of server-side override: add a new company entry on top.
// In a real app this might come from a database query.
// $stores->merge('workStore', ['companies' => $my_database_rows]);

// ---------------------------------------------------------------------------
// Component setup
// ---------------------------------------------------------------------------
$fs_base  = __DIR__ . '/../portfolio/components';
$web_base = '/swc/test/portfolio/components';

$components = new ComponentRegistry(
    fs_base:  $fs_base,
    web_base: $web_base,
    stores:   $stores,
);

// ---------------------------------------------------------------------------
// skills-grid's template uses 'filteredSkills', which its JS computed()
// derives from the store. set_computed() is the server-side equivalent.
// ---------------------------------------------------------------------------
$components->set_computed('skills-grid', static function (array $data): array {
    $query = strtolower(trim($data['skillsStore']['query'] ?? ''));
    $all   = $data['skillsStore']['skills'] ?? [];

    return [
        'filteredSkills' => $query === ''
            ? $all
            : array_values(array_filter($all, static fn(array $skill): bool => str_contains(strtolower($skill['name']), $query))),
    ];
});

// ---------------------------------------------------------------------------
// Build slotted children for about-section
// ---------------------------------------------------------------------------
$work_history_html = $components->render('work-history', ['slot' => 'history']);
$skills_grid_html  = $components->render('skills-grid', ['slot' => 'skills']);

$about_section_html = $components->render(
    tag_name:   'about-section',
    host_attrs: [],
    light_dom:  $work_history_html . "\n" . $skills_grid_html,
);

?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TK — Team lead, developer, teacher. (SSR)</title>

    <?php echo $components->preload_tags() ?>

    <?php echo $stores->to_script_tag() ?>

    <script type="importmap">
    {
        "imports": {
            "swc": "/swc/test/portfolio/swc.js"
        }
    }
    </script>

    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { font-family: monospace; }
        body { background: #fff; }
    </style>
</head>
<body>

    <?php echo $components->render('site-nav') ?>

    <?php echo $components->render('hero-section') ?>

    <?php echo $about_section_html ?>

    <script type="module" src="/swc/test/portfolio/components/index.js"></script>
</body>
</html>
