<?php

declare(strict_types=1);

/**
 * Portfolio SSR demo — PHP-rendered version of swc/test/portfolio/index.html
 *
 * Demonstrates:
 *  - StoreRegistry auto-discovers stores/ folder, loads default state from store.json
 *  - Server-side data merged on top via merge()
 *  - ComponentRegistry auto-discovers components/ folder via component.json
 *  - preload_tags() in <head> for CSS
 *  - StoreRegistry::to_script_tag() sets window.__SWC_INITIAL_STATE__
 *  - Components rendered as Declarative Shadow DOM — content visible before JS loads
 *  - about-section gets work-history and skills-grid as slotted light DOM children
 *  - JS loads, createStore() picks up SSR state, morph() is a no-op (zero flicker)
 */

// ---------------------------------------------------------------------------
// Autoload — load all PHP classes from swc/src/php/src/
// ---------------------------------------------------------------------------
$php_src = __DIR__ . '/../../src/php/src';
foreach (['Sanitizer', 'NanoRenderer', 'StateInjector', 'Component', 'StoreRegistry', 'ComponentRegistry'] as $class) {
    include_once $php_src . '/' . $class . '.php';
}

use SWC\StoreRegistry;
use SWC\ComponentRegistry;
use SWC\Component;

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
// skills-grid needs 'filteredSkills' — a value computed by JS computed() on
// the client side. For SSR we pre-compute it: no query = all skills.
// ---------------------------------------------------------------------------
$skills_data                   = $stores->get_state('skillsStore');
$skills_data['filteredSkills'] = $skills_data['skills'];

$skills_grid_component = new Component(
    fs_path:  $fs_base . '/skills-grid',
    web_path: $web_base . '/skills-grid',
    tag_name: 'skills-grid',
);

// ---------------------------------------------------------------------------
// Build slotted children for about-section
// ---------------------------------------------------------------------------
$work_history_html = $components->render('work-history', ['slot' => 'history']);
$skills_grid_html  = $skills_grid_component->render($skills_data, ['slot' => 'skills']);

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
