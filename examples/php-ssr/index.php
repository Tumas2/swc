<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/php/swc.php';

use SWC\StoreRegistry;
use SWC\ComponentRegistry;

// ── Store setup ──────────────────────────────────────────────────────────────
// In a real app this data would come from a database or CMS.
$stores = new StoreRegistry(__DIR__ . '/stores');
$stores->merge(
    'post', [
    'title'    => 'The quiet power of reactive state',
    'author'   => 'Alex Jensen',
    'date'     => 'March 2026',
    'readTime' => '4 min read',
    'body'     => [
        'State management doesn\'t have to be complicated. A store is just a container
         that holds data and tells interested components when that data changes.',
        'When a store updates, every component subscribed to it re-renders automatically.
         No manual DOM manipulation. No event buses. No prop drilling through layers of
         components that don\'t even use the data.',
        'The magic happens on first load when PHP renders the component as Declarative
         Shadow DOM — the content is visible before any JavaScript runs. When JS arrives,
         it reads the pre-injected state from window.__SWC_INITIAL_STATE__ and the first
         render is a no-op: morph compares the server HTML against what it would generate
         and finds nothing to change.',
    ],
    ]
);

// ── Component registry ───────────────────────────────────────────────────────
// Adjust web_base to match the URL path where this example is served.
$components = new ComponentRegistry(
    fs_base:  __DIR__ . '/components',
    web_base: '/swc/examples/php-ssr/components',
    stores:   $stores,
);

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP SSR — SWC Example</title>

    <!-- Preload component stylesheets so CSS is ready before the DSD is parsed -->
    <?php echo $components->preload_tags() ?>

    <!-- Inject initial state for JS hydration -->
    <?php echo $stores->to_script_tag() ?>

    <script type="importmap">
    {
        "imports": {
            "swc": "./swc.js"
        }
    }
    </script>

    <!-- Load component JS (auto-generated from ComponentRegistry) -->
    <?php echo $components->script_tags() ?>

    <style>
        body {
            margin: 3rem auto;
            max-width: 720px;
            font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
        }
    </style>
</head>
<body>

    <?php echo $components->render('blog-post') ?>

</body>
</html>
